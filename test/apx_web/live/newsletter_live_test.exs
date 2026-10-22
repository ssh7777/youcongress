defmodule APXWeb.NewsletterLiveTest do
  use APXWeb.ConnCase

  import Phoenix.LiveViewTest
  import Swoosh.TestAssertions
  import APX.AccountsFixtures

  test "shows a local newsletter confirmation form", %{conn: conn} do
    {:ok, view, html} = live(conn, ~p"/subscribe")
    assert html =~ "Subscribe to APX updates"
    assert has_element?(view, "form#newsletter-form")
    assert has_element?(view, "input[name='newsletter[email]']")
    assert has_element?(view, "a[href='/privacy-policy']")
    refute html =~ "Substack"
  end

  test "requests double-opt-in confirmation", %{conn: conn} do
    email = "reader@example.test"
    {:ok, view, _html} = live(conn, ~p"/subscribe")

    view
    |> form("#newsletter-form", newsletter: %{email: email})
    |> render_submit()

    assert has_element?(view, "#newsletter-confirmation-sent")

    assert_email_sent(fn sent_email ->
      sent_email.to == [{"", email}] and
        sent_email.subject == "Confirm your APX newsletter subscription" and
        sent_email.text_body =~ "/newsletter/confirm/"
    end)
  end

  test "pre-fills the email for signed-in subscribers", %{conn: conn} do
    user = user_fixture()
    conn = log_in_user(conn, user)

    {:ok, view, _html} = live(conn, ~p"/subscribe")
    assert has_element?(view, "input[value='#{user.email}']")
  end
end
