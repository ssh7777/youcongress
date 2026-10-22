defmodule APXWeb.PolicyVerificationFrameworkLiveTest do
  use APXWeb.ConnCase, async: true

  import Phoenix.LiveViewTest

  @path "/independent-policy-verification-framework"

  test "the public framework page is branded and explains its limits", %{conn: conn} do
    html = conn |> get(@path) |> html_response(200)
    document = Floki.parse_document!(html)

    assert Floki.text(Floki.find(document, "h1")) =~ "Independent Policy Verification Framework"
    assert Floki.attribute(document, "link[rel=canonical]", "href") ==
             [APXWeb.Endpoint.url() <> @path]

    assert html =~ "Empirical Consensus Metrics"
    assert html =~ "Non-Deterministic System Verification"
    assert html =~ "Sovereign Telemetry"
    assert html =~ "not a government service"
    assert Floki.find(document, "footer a[href='/intelligence']") != []
  end

  test "the interactive scenario updates all four outcomes accessibly", %{conn: conn} do
    {:ok, view, _html} = live(conn, @path)
    assert has_element?(view, "#race-outcome", "Stronger safeguards")
    assert has_element?(view, "#lab-a-safety[aria-pressed=true]")
    assert has_element?(view, "#lab-b-safety[aria-pressed=true]")

    view |> element("#lab-a-speed") |> render_click()
    assert has_element?(view, "#race-outcome", "Lab A may pull ahead. Lab B feels the pressure.")
    assert has_element?(view, "#race-outcome dl > div:first-child", "head start")
    assert has_element?(view, "#lab-a-speed[aria-pressed=true]")
    assert has_element?(view, "#lab-a-safety[aria-pressed=false]")

    view |> element("#lab-b-speed") |> render_click()
    assert has_element?(view, "#race-outcome", "A faster race. No clear relative winner.")

    view |> element("#lab-a-safety") |> render_click()
    assert has_element?(view, "#race-outcome", "Lab B may pull ahead. Lab A feels the pressure.")

    view |> element("#lab-b-safety") |> render_click()
    assert has_element?(view, "#race-outcome[aria-live=polite][aria-atomic=true]", "Stronger safeguards")
  end

  test "invalid choices leave the scenario unchanged", %{conn: conn} do
    {:ok, view, _html} = live(conn, @path)
    render_click(view, "choose", %{"lab" => "unknown", "choice" => "speed"})
    render_click(view, "choose", %{"lab" => "a", "choice" => "unknown"})
    render_click(view, "choose", %{})
    assert has_element?(view, "#lab-a-safety[aria-pressed=true]")
    assert has_element?(view, "#lab-b-safety[aria-pressed=true]")
  end
end
