defmodule APX.Workers.ReconsiderationCreatedNotificationWorkerTest do
  use APX.DataCase

  import Swoosh.TestAssertions

  alias APX.Workers.ReconsiderationCreatedNotificationWorker

  test "emails the configured notification recipient with the page creator's name and URL" do
    reconsideration_url = APXWeb.Endpoint.url() <> "/@ada/r/analytical-engine"

    assert :ok =
             ReconsiderationCreatedNotificationWorker.perform(%Oban.Job{
               args: %{
                 "creator_name" => "Ada Lovelace",
                 "reconsideration_url" => reconsideration_url
               }
             })

    assert_email_sent(fn email ->
      assert email.to == [{"", "admin@example.test"}]
      assert email.subject == "New APX Reconsider page"
      assert email.text_body =~ "Creator: Ada Lovelace"
      assert email.text_body =~ "Page: #{reconsideration_url}"
      assert email.html_body =~ "Creator: Ada Lovelace"
      assert email.html_body =~ ~s(href="#{reconsideration_url}")
      true
    end)
  end
end
