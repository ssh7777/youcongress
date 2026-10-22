defmodule APX.Workers.NewUserSignupNotificationWorkerTest do
  use APX.DataCase
  use Oban.Testing, repo: APX.Repo

  import Swoosh.TestAssertions

  alias APX.Accounts
  alias APX.Workers.NewUserSignupNotificationWorker

  test "emails the configured notification recipient with the profile link" do
    profile_url = APXWeb.Endpoint.url() <> "/a/42"

    assert :ok =
             NewUserSignupNotificationWorker.perform(%Oban.Job{
               args: %{"name" => "Ada Lovelace", "profile_url" => profile_url}
             })

    assert_email_sent(fn email ->
      assert email.to == [{"", "admin@example.test"}]
      assert email.subject == "New APX signup"
      assert email.text_body =~ "Name: Ada Lovelace"
      assert email.text_body =~ "Profile: #{profile_url}"
      assert email.html_body =~ "Name: Ada Lovelace"
      assert email.html_body =~ ~s(href="#{profile_url}")
      refute email.text_body =~ "ada@example.com"
      refute email.html_body =~ "ada@example.com"
      true
    end)
  end

  test "queues the notification after an X user provides their profile details" do
    {:ok, %{user: user}} =
      Accounts.x_register_user(%{}, %{
        name: "Initial X Name",
        twitter_username: "initial_x_name",
        twin_origin: false
      })

    Oban.Testing.with_testing_mode(:manual, fn ->
      assert {:ok, updated_user} =
               Accounts.complete_x_user_profile(user, "x-user@example.com", "Updated X Name")

      assert updated_user.email == "x-user@example.com"
      assert updated_user.author.name == "Updated X Name"
    end)

    assert_enqueued(
      worker: NewUserSignupNotificationWorker,
      args: %{
        "name" => "Updated X Name",
        "profile_url" => APXWeb.Endpoint.url() <> "/x/initial_x_name"
      }
    )
  end
end
