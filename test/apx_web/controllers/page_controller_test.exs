defmodule APXWeb.PageControllerTest do
  use APXWeb.ConnCase, async: true

  import APX.StatementsFixtures
  import APX.OpinionsFixtures

  test "mission pages are public, linked, and have canonical metadata", %{conn: conn} do
    for {path, heading, linked_path} <- [
          {"/about", "Sovereign Policy Analytics & Expert Consensus Engine", "/intelligence"},
          {
            "/theory-of-change",
            "From shared evidence to better AI governance",
            "/independent-policy-verification-framework"
          }
        ] do
      html = conn |> get(path) |> html_response(200)
      document = Floki.parse_document!(html)
      assert Floki.text(Floki.find(document, "h1")) =~ heading
      assert length(Floki.find(document, "h1")) == 1
      assert Floki.attribute(document, "link[rel=canonical]", "href") == [APXWeb.Endpoint.url() <> path]
      assert Floki.attribute(document, "meta[name=description]", "content") != []
      assert Floki.find(document, "a[href='#{linked_path}']") != []
    end
  end

  describe "GET /status/24h" do
    test "returns OK for a positively verified quote dated today", %{conn: conn} do
      opinion_fixture(%{
        verification_status: :verified,
        date: Date.utc_today(),
        date_precision: :day
      })

      conn = get(conn, ~p"/status/24h")
      assert response(conn, 200) == "OK"
      assert get_resp_header(conn, "content-type") == ["text/plain; charset=utf-8"]
    end

    test "returns the latest positive quote date when no quote is recent", %{conn: conn} do
      latest_date = Date.add(Date.utc_today(), -2)
      opinion_fixture(%{verification_status: :verified, date: latest_date, date_precision: :day})
      opinion_fixture(%{verification_status: :disputed, date: Date.utc_today(), date_precision: :day})

      conn = get(conn, ~p"/status/24h")
      assert response(conn, 200) == Date.to_iso8601(latest_date)
    end

    test "reports that no dated verified quote exists", %{conn: conn} do
      opinion_fixture(%{verification_status: :verified, date: nil})
      conn = get(conn, ~p"/status/24h")
      assert response(conn, 200) == "No verified quote date available"
    end
  end

  test "GET / loads the APX-branded homepage", %{conn: conn} do
    html = conn |> get(~p"/") |> html_response(200)
    assert html =~ "APX"
    assert html =~ "Intelligence"
    refute html =~ ~s(id="cookie-banner")
    refute html =~ "Cookie settings"
  end

  test "GET / shows analytics choices to a logged-in user", %{conn: conn} do
    html = conn |> log_in_as_user() |> get(~p"/") |> html_response(200)
    assert html =~ ~s(id="cookie-banner")
    assert html =~ "we use optional analytics"
    assert html =~ "We only do this if you accept"
    assert html =~ "Cookie settings"
    refute html =~ "usage events to Amplitude"
  end

  test "privacy and terms pages use project contact routes", %{conn: conn} do
    privacy = conn |> get(~p"/privacy-policy") |> html_response(200)
    assert privacy =~ "Privacy Policy"
    assert privacy =~ "Information APX processes"
    assert privacy =~ ~s(href="/contact")

    terms = conn |> get(~p"/terms") |> html_response(200)
    assert terms =~ "Terms and Conditions"
    assert terms =~ ~s(href="/contact")
    refute terms =~ "support@"
  end

  test "GET /about describes APX without personal or unsupported institutional claims", %{conn: conn} do
    html = conn |> get(~p"/about") |> html_response(200)
    assert html =~ "About APX"
    assert html =~ "intended audience, not an endorsement"
    assert html =~ "not currently a registered non-profit institute"
    assert html =~ ~s(href="/contact")
  end

  test "GET /about loads for an authenticated user", %{conn: conn} do
    document = conn |> log_in_as_user() |> get(~p"/about") |> html_response(200) |> Floki.parse_document!()
    assert Floki.find(document, "a[href='/intelligence']") != []
  end

  test "GET /faq explains liquid democracy and verification boundaries", %{conn: conn} do
    html = conn |> get(~p"/faq") |> html_response(200)
    assert html =~ "Frequently asked questions"
    assert html =~ "A direct vote always takes precedence"
    assert html =~ "If those delegate votes are tied"
    assert html =~ "Empirical Consensus Metrics"
    assert html =~ "Non-Deterministic System Verification"
    assert html =~ "Sovereign Telemetry"
    assert html =~ "not a separate legal entity"
  end

  test "GET /independent-policy-verification-framework loads without legacy branding", %{conn: conn} do
    html = conn |> get(~p"/independent-policy-verification-framework") |> html_response(200)
    assert html =~ "Independent Policy Verification Framework"
    assert html =~ "Empirical Consensus Metrics"
    assert html =~ "Non-Deterministic System Verification"
    assert html =~ "Sovereign Telemetry"
  end

  test "GET /email-login-waiting-list", %{conn: conn} do
    html = conn |> get(~p"/email-login-waiting-list") |> html_response(200)
    assert html =~ "Waiting list for email/password login - APX"
  end

  test "GET /email-login-waiting-list/thanks", %{conn: conn} do
    conn = get(conn, ~p"/email-login-waiting-list/thanks")
    assert html_response(conn, 302) =~ "redirected"
  end

  test "GET /mcp-tools uses the configured host in examples", %{conn: conn} do
    html = conn |> get(~p"/mcp-tools") |> html_response(200)
    assert html =~ "APX MCP Tools"
    assert html =~ "How to Connect"
    assert html =~ APXWeb.Endpoint.url() <> "/mcp?key=YOUR_API_KEY"
  end

  test "MCP setup guides use the configured endpoint", %{conn: conn} do
    claude = conn |> get(~p"/mcp/claude") |> html_response(200)
    assert claude =~ "Use APX from Claude"
    assert claude =~ "Access write tools"
    assert claude =~ "Authorization"
    assert claude =~ "Bearer YOUR_API_KEY"
    assert claude =~ APXWeb.Endpoint.url() <> "/mcp?key=YOUR_API_KEY"

    chatgpt = conn |> get(~p"/mcp/chatgpt") |> html_response(200)
    assert chatgpt =~ "Use APX from ChatGPT"
    assert chatgpt =~ APXWeb.Endpoint.url() <> "/mcp"
    assert chatgpt =~ APXWeb.Endpoint.url() <> "/mcp?key=YOUR_API_KEY"
  end

  test "GET /robots.txt advertises the dynamic sitemap", %{conn: conn} do
    conn = get(conn, ~p"/robots.txt")
    assert get_resp_header(conn, "content-type") == ["text/plain; charset=utf-8"]
    assert response(conn, 200) =~ "Sitemap: #{APXWeb.Endpoint.url()}/sitemap.xml"
  end

  test "GET /sitemap.xml lists current static and statement URLs", %{conn: conn} do
    statement = statement_fixture(%{title: "Transparent AI policy"})
    article = APX.Repo.insert!(%APX.Intelligence.Article{
      title: "Sourced intelligence brief",
      slug: "sourced-intelligence-brief-ab12cd34",
      canonical_url: "https://publisher.example/article/1",
      source_name: "Example Publisher",
      source_domain: "publisher.example",
      category: "ai_policy_governance",
      ingested_at: DateTime.utc_now() |> DateTime.truncate(:second),
      impact_rating: "medium"
    })

    conn = get(conn, ~p"/sitemap.xml")
    body = response(conn, 200)
    base = APXWeb.Endpoint.url()

    assert get_resp_header(conn, "content-type") == ["application/xml; charset=utf-8"]
    assert body =~ "<loc>#{base}#{~p"/reconsider"}</loc>"
    assert body =~ "<loc>#{base}#{~p"/independent-policy-verification-framework"}</loc>"
    assert body =~ "<loc>#{base}#{~p"/intelligence"}</loc>"
    assert body =~ "<loc>#{base}#{~p"/intelligence/#{article.slug}"}</loc>"
    assert body =~ "<loc>#{base}#{~p"/p/#{statement.slug}"}</loc>"
    assert body =~ ~r"<lastmod>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z</lastmod>"
  end

  test "GET /sitemap.xml includes attributed authors, halls and quote pages", %{conn: conn} do
    statement = statement_fixture(%{title: "Sitemap test statement"})
    {:ok, _} = APX.HallsStatements.sync!(statement.id, %{main_tag: "ai-safety", other_tags: []})
    quoted_author = APX.AuthorsFixtures.author_fixture(%{name: "Quoted Author", twitter_username: "quotedauthor"})
    quote_opinion = APX.OpinionsFixtures.opinion_fixture(%{
      author_id: quoted_author.id,
      twin: false,
      source_url: "https://example.com/quote"
    })
    APX.AuthorsFixtures.author_fixture(%{name: "Quoteless Author", twitter_username: "quotelessauthor"})

    body = conn |> get(~p"/sitemap.xml") |> response(200)
    base = APXWeb.Endpoint.url()
    assert body =~ "<loc>#{base}/x/quotedauthor</loc>"
    refute body =~ "<loc>#{base}/x/quotelessauthor</loc>"
    assert body =~ "<loc>#{base}/h/ai-safety</loc>"
    assert body =~ "<loc>#{base}/c/#{quote_opinion.id}</loc>"
  end

  test "GET /llms.txt describes APX content and keeps the MCP docs", %{conn: conn} do
    statement = statement_fixture(%{title: "LLMs statement title"})
    {:ok, _} = APX.HallsStatements.sync!(statement.id, %{main_tag: "ai-safety", other_tags: []})
    author = APX.AuthorsFixtures.author_fixture(%{name: "LLMs Author"})
    APX.OpinionsFixtures.opinion_fixture(%{author_id: author.id, twin: false, source_url: "https://example.com/llms"})

    body = conn |> get(~p"/llms.txt") |> response(200)
    assert body =~ "# APX"
    assert body =~ "## Topics"
    assert body =~ "[AI Safety]("
    assert body =~ "## Policy & cyber intelligence"
    assert body =~ "## Key authors"
    assert body =~ "[LLMs Author]("
    assert body =~ "## Top statements"
    assert body =~ "LLMs statement title"
    assert body =~ "## MCP server (for AI agents)"
    assert body =~ APXWeb.Endpoint.url() <> "/mcp"
    assert body =~ "?key=YOUR_API_KEY"
    assert body =~ "not full-text reporting"
  end
end
