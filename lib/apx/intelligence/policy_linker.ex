defmodule APX.Intelligence.PolicyLinker do
  @moduledoc """
  Deterministic, inspectable triage helpers for RSS items. The three-bullet brief
  is based only on the feed headline/excerpt; policy links are ranked against
  APX statement titles and topic names, never invented by a language model.
  """

  @category_info %{
    "ai_policy_governance" => %{
      label: "AI Policy & Governance",
      definition:
        "The laws, standards, institutions and oversight practices used to guide the development and deployment of AI systems.",
      keywords: "artificial intelligence AI governance regulation policy alignment safety model evaluation"
    },
    "sovereign_technology" => %{
      label: "Sovereign Technology & Infrastructure",
      definition:
        "The ability to operate, secure and govern strategic digital infrastructure, data, compute and technical capabilities.",
      keywords: "sovereign technology infrastructure data cloud compute semiconductor resilience"
    },
    "cyber_warfare" => %{
      label: "Cyber Conflict & Automated Exploitation",
      definition:
        "Cyber operations, vulnerabilities and automated exploitation that may affect public institutions or critical systems.",
      keywords: "cyber cybersecurity warfare defense security exploit vulnerability critical infrastructure"
    },
    "information_operations" => %{
      label: "Information Operations & AI-Mediated Influence",
      definition:
        "Coordinated efforts to shape information environments, including influence campaigns and AI-enabled manipulation.",
      keywords: "information operations disinformation misinformation propaganda influence election synthetic media"
    }
  }

  @stop_words MapSet.new(~w(
    about after against among also because before being between could does each from have into
    itself more most other should some than that their them then there these they this through
    under using what when where which while with would your will shall shall
  ))

  @critical_terms ~r/\b(zero[- ]day|actively exploited|active exploitation|ransomware|destructive wiper|critical infrastructure attack|armed conflict|military operation|nation[- ]state attack|election interference)\b/i
  @high_terms ~r/\b(cybersecurity|cyber attack|cyberattack|artificial intelligence|ai governance|ai policy|regulation|national security|critical infrastructure|autonomous weapon|data sovereignty|disinformation|information operation|security advisory)\b/i

  def category_label(category), do: Map.get(@category_info, category, %{label: "Policy Intelligence"}).label

  def category_definition(category),
    do:
      Map.get(@category_info, category, %{
        definition: "A source-linked development relevant to public policy and strategic infrastructure."
      }).definition

  def entity_definitions(category) do
    [
      %{name: category_label(category), definition: category_definition(category)},
      %{
        name: "Source attribution",
        definition:
          "A canonical link to the originating publisher; APX's summary is a triage aid, not a replacement for the source."
      },
      %{
        name: "Sovereign impact rating",
        definition:
          "A rule-based editorial triage label inferred from the headline and short feed excerpt, not an official threat assessment."
      }
    ]
  end

  def impact_rating(title, summary \\ nil) do
    text = [title, summary] |> Enum.reject(&is_nil/1) |> Enum.join(" ")

    cond do
      Regex.match?(@critical_terms, text) ->
        {"critical", "The headline or feed excerpt contains an acute cyber, conflict or critical-infrastructure signal."}

      Regex.match?(@high_terms, text) ->
        {"high", "The headline or feed excerpt indicates a material governance, security or strategic-technology development."}

      true ->
        {"medium", "The item passed APX's policy relevance filter; the short feed metadata does not establish an acute operational threat."}
    end
  end

  def claims(title, summary) do
    sentences =
      (summary || "")
      |> String.trim()
      |> case do
        "" -> []
        text -> Regex.split(~r/(?<=[.!?])\s+/, text)
      end
      |> Enum.map(&String.trim/1)
      |> Enum.reject(&(String.length(&1) < 24))
      |> Enum.uniq()
      |> Enum.take(3)

    if sentences == [], do: ["Reported headline: #{title}"], else: sentences
  end

  def executive_brief(title, summary, category, rating, rationale) do
    source_context =
      case claims(title, summary) do
        [claim | _] when is_binary(summary) and summary != "" ->
          "Source excerpt: #{truncate(claim, 300)}"

        _ ->
          "Source context: the publisher's feed did not include a synopsis; consult the original report."
      end

    [
      "Signal: #{truncate(title, 300)}",
      source_context,
      "Sovereign impact: #{String.capitalize(rating)}. #{rationale}"
    ]
  end

  def policy_links(article, proposals) when is_list(proposals) do
    category_terms = Map.get(Map.get(@category_info, article.category, %{}), :keywords, "")

    article_tokens =
      [article.title, article.summary || "", category_terms]
      |> Enum.join(" ")
      |> tokens()
      |> MapSet.new()

    proposals
    |> Enum.map(fn proposal ->
      halls = Map.get(proposal, :halls, []) || []
      hall_names = Enum.map(halls, &Map.get(&1, :name, ""))
      searchable = Enum.join([proposal.title | hall_names], " ")
      score = Enum.count(tokens(searchable), &MapSet.member?(article_tokens, &1))

      %{title: proposal.title, slug: proposal.slug, halls: hall_names, score: score}
    end)
    |> Enum.filter(&(&1.score >= 2))
    |> Enum.sort_by(& &1.score, :desc)
    |> Enum.take(3)
    |> Enum.map(fn item ->
      Map.take(item, [:title, :slug, :halls])
    end)
  end

  defp tokens(text) do
    Regex.scan(~r/[\p{L}\p{N}]+/u, String.downcase(text))
    |> List.flatten()
    |> Enum.reject(fn token ->
      (String.length(token) < 3 and token != "ai") or MapSet.member?(@stop_words, token)
    end)
  end

  defp truncate(text, max) do
    if String.length(text) <= max, do: text, else: String.slice(text, 0, max - 1) <> "…"
  end
end
