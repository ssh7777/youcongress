defmodule APX.Workers.NewUserSignupNotificationWorker do
  @moduledoc """
  Delivers the internal notification for a newly created APX account.
  """

  use Oban.Worker, queue: :mailers, max_attempts: 5

  alias APX.Accounts.UserNotifier

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"name" => name, "profile_url" => profile_url}}) do
    case UserNotifier.deliver_new_user_signup_notification(name, profile_url) do
      {:ok, _email} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end
end
