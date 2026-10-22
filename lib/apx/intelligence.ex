defmodule APX.Intelligence do
  @moduledoc """
  Source-first intelligence curation. Fetches configured public RSS/Atom feeds,
  applies explicit relevance and freshness rules, and persists short structured
  triage records with publisher backlinks. It does not republish full articles.
  """

  import Ecto.Query, warn: false
  require Logger

  alias APX.Intelligence.Article
  alias APX.Intelligence.FeedParser
  alias APX.Intelligence.PolicyLinker
  alias APX.Repo

  @default_max_items_per_feed 25
  @default_max_age_days 120
  @max_policy_proposals 1_000
  @consumer_or_clickbait ~r/\b(iphone|smartphone|smartwatch|earbuds|gaming console|consumer gadget|product review|best laptops|price drop|streaming service|celebrity|box office|you won't believe|shocking reveal|top 10 gadgets)\b/i
  @policy_relevance ~r/\b(ai|artificial intelligence|machine learning|large language model|llm|cyber(?:security)?|ransomware|malware|phishing|zero[- ]day|critical infrastructure|national security|defense|military|autonomous weapon|information operation|disinformation|misinformation|propaganda|election security|data sovereignty|sovereign technology|ai act|ai governance|export control|semiconductor|compute infrastructure|quantum security)\b/i

  def list_articles(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    category = Keyword.get(opts, :category)

    from(article in Article,
      order_by: [desc_nulls_last: article.published_at, desc: article.ingested_at],
      limit: ^limit
    )
    |> maybe_filter_category(category)
    |> Repo.all()
  end

  def get_article_by_slug(slug) when is_binary(slug), do: Repo.get_by(Article, slug: slug)
  def get_article_by_slug(_), do: nil

  def default_feeds do
    Application.get_env(:apx, :intelligence, [])
    |> Keyword.get(:feeds, [])
  end

  def relevant?(item) when is_map(item) do
    category = Map.get(item, :category) || Map.get(item, "category")
    title = Map.get(item, :title) || Map.get(item, "title") || ""
    summary = Map.get(item, :summary) || Map.get(item, "summary") || ""
    text = title <> " " <> summary

    category in Article.categories() and
      not Regex.match?(@consumer_or_clickbait, text) and
      Regex.match?(@policy_relevance, text)
  end

  def relevant?(_), do: false

  def ingest(opts \\ []) do
    feeds = Keyword.get(opts, :feeds, default_feeds())
    fetcher = Keyword.get(opts, :fetcher, &fetch_feed/1)
    settings = Application.get_env(:apx, :intelligence, [])
    max_items = Keyword.get(opts, :max_items_per_feed, Keyword.get(settings, :max_items_per_feed, @default_max_items_per_feed))
    max_age_days = Keyword.get(opts, :max_age_days, Keyword.get(settings, :max_age_days, @default_max_age_days))
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    proposals = policy_proposals()

    stats =
      Enum.reduce(feeds, empty_stats(), fn feed, stats ->
        case fetcher.(feed) do
          {:ok, body} when is_binary(body) ->
            items = FeedParser.parse(body, feed)

            stats = %{
              stats
              | feeds_successful: stats.feeds_successful + 1,
                items_parsed: stats.items_parsed + length(items)
            }

            items
            |> Enum.take(max_items)
            |> Enum.reduce(stats, fn item, acc ->
              if relevant?(item) and fresh_enough?(item.published_at, now, max_age_days) do
                case persist_item(item, proposals, now) do
                  :inserted -> %{acc | items_imported: acc.items_imported + 1}
                  :duplicate -> %{acc | items_duplicate: acc.items_duplicate + 1}
                  :invalid -> %{acc | items_failed: acc.items_failed + 1}
                end
              else
                %{acc | items_rejected: acc.items_rejected + 1}
              end
            end)

          {:error, reason} ->
            Logger.warning("APX intelligence feed failed (#{feed_value(feed, :name)}): #{inspect(reason)}")
            %{stats | feeds_failed: stats.feeds_failed + 1}

          other ->
            Logger.warning("APX intelligence feed returned an unexpected response (#{feed_value(feed, :name)}): #{inspect(other)}")
            %{stats | feeds_failed: stats.feeds_failed + 1}
        end
      end)

    cond do
      feeds != [] and stats.feeds_successful == 0 ->
        {:error, :all_feeds_failed}

      true ->
        {:ok, stats}
    end
  end

  defp persist_item(item, proposals, now) do
    if Repo.get_by(Article, canonical_url: item.canonical_url) do
      :duplicate
    else
      {rating, rationale} = PolicyLinker.impact_rating(item.title, item.summary)
      claims = PolicyLinker.claims(item.title, item.summary)
      brief = PolicyLinker.executive_brief(item.title, item.summary, item.category, rating, rationale)
      links = PolicyLinker.policy_links(item, proposals)
      source_domain = URI.parse(item.canonical_url).host
      slug = article_slug(item.title, item.canonical_url)

      attrs = %{
        title: item.title,
        slug: slug,
        canonical_url: item.canonical_url,
        source_name: item.source_name,
        source_domain: source_domain,
        category: item.category,
        summary: item.summary,
        published_at: item.published_at,
        ingested_at: now,
        impact_rating: rating,
        impact_rationale: rationale,
        executive_brief: %{
          "bullets" => brief,
          "method" => "rule_based_rss_triage"
        },
        key_policy_stances: %{
          "claims" => claims,
          "method" => "headline_and_rss_excerpt"
        },
        policy_links: %{
          "links" =>
            Enum.map(links, fn link ->
              %{
                "title" => link.title,
                "slug" => link.slug,
                "topics" => link.halls
              }
            end)
        }
      }

      case %Article{} |> Article.changeset(attrs) |> Repo.insert() do
        {:ok, _article} ->
          :inserted

        {:error, changeset} ->
          Logger.debug("Skipping invalid intelligence feed item: #{inspect(changeset.errors)}")
          :invalid
      end
    end
  end

  defp fetch_feed(feed) do
    url = feed_value(feed, :url)

    with true <- valid_feed_url?(url),
         request <-
           Finch.build(:get, url, [
             {"accept", "application/atom+xml, application/rss+xml, application/xml, text/xml"},
             {"user-agent", "APX-Intelligence/1.0 (+policy source attribution)"}
           ]),
         {:ok, %Finch.Response{status: status, body: body}} <-
           Finch.request(request, Swoosh.Finch, receive_timeout: 20_000, pool_timeout: 5_000),
         true <- status in 200..299 do
      {:ok, body}
    else
      false -> {:error, :invalid_or_non_https_feed_url}
      {:ok, %Finch.Response{status: status}} -> {:error, {:http_status, status}}
      {:error, reason} -> {:error, reason}
    end
  end

  defp valid_feed_url?(url) when is_binary(url) do
    case URI.parse(url) do
      %URI{scheme: "https", host: host, userinfo: nil} when is_binary(host) and host != "" -> true
      _ -> false
    end
  end

  defp valid_feed_url?(_), do: false

  defp policy_proposals do
    APX.Statements.list_statements(
      preload: [:halls],
      order: :updated_at_desc,
      limit: @max_policy_proposals
    )
  end

  defp fresh_enough?(nil, _now, _max_age_days), do: true

  defp fresh_enough?(%DateTime{} = published_at, now, max_age_days) do
    age_in_seconds = DateTime.diff(now, published_at, :second)
    age_in_seconds <= max_age_days * 86_400 and age_in_seconds >= -86_400
  end

  defp fresh_enough?(_, _now, _max_age_days), do: false

  defp article_slug(title, canonical_url) do
    stem =
      title
      |> Slug.slugify()
      |> String.slice(0, 90)
      |> case do
        "" -> "policy-intelligence"
        slug -> slug
      end

    digest = :crypto.hash(:sha256, canonical_url) |> binary_part(0, 4) |> Base.encode16(case: :lower)
    "#{stem}-#{digest}"
  end

  defp maybe_filter_category(query, category) do
    if category in Article.categories() do
      where(query, [article], article.category == ^category)
    else
      query
    end
  end

  defp feed_value(feed, key), do: Map.get(feed, key) || Map.get(feed, Atom.to_string(key))

  defp empty_stats do
    %{
      feeds_successful: 0,
      feeds_failed: 0,
      items_parsed: 0,
      items_rejected: 0,
      items_imported: 0,
      items_duplicate: 0,
      items_failed: 0
    }
  end
end
