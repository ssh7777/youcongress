defmodule APXWeb.IntelligenceController do
  use APXWeb, :controller

  alias APX.Intelligence
  alias APX.Intelligence.Article
  alias APX.Intelligence.PolicyLinker
  alias APXWeb.SEO

  def index(conn, params) do
    category = valid_category(params["category"])
    articles = Intelligence.list_articles(limit: 60, category: category)
    canonical_url = url(~p"/intelligence")

    render(conn, :index,
      articles: articles,
      category: category,
      categories: Article.categories(),
      category_label: if(category, do: PolicyLinker.category_label(category), else: nil),
      page_title: "APX Intelligence — Policy, AI & Cyber Signals",
      skip_page_suffix: true,
      page_description:
        "Source-linked policy and cyber intelligence on AI governance, sovereign technology, cyber conflict and information operations.",
      canonical_url: canonical_url,
      structured_data: SEO.intelligence_index(canonical_url, articles)
    )
  end

  def show(conn, %{"slug" => slug}) do
    case Intelligence.get_article_by_slug(slug) do
      nil ->
        conn
        |> put_status(:not_found)
        |> put_view(html: APXWeb.ErrorHTML)
        |> render(:"404")

      article ->
        canonical_url = url(~p"/intelligence/#{article.slug}")

        render(conn, :show,
          article: article,
          category_label: PolicyLinker.category_label(article.category),
          entity_definitions: PolicyLinker.entity_definitions(article.category),
          policy_links: get_in(article.policy_links || %{}, ["links"]) || [],
          claims: get_in(article.key_policy_stances || %{}, ["claims"]) || [],
          executive_bullets: get_in(article.executive_brief || %{}, ["bullets"]) || [],
          page_title: "#{article.title} | APX Intelligence",
          skip_page_suffix: true,
          page_description: page_description(article),
          canonical_url: canonical_url,
          structured_data: SEO.intelligence_article(article, canonical_url)
        )
    end
  end

  defp valid_category(category) do
    if category in Article.categories(), do: category, else: nil
  end

  defp page_description(%{summary: summary}) when is_binary(summary) and summary != "" do
    String.slice(summary, 0, 280)
  end

  defp page_description(article) do
    "A source-linked APX intelligence brief on #{PolicyLinker.category_label(article.category)}. Read the original publisher's report and review the automated triage method."
  end
end
