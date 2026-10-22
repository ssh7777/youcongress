defmodule APX.Workers.NewsletterConfirmationWorker do
  @moduledoc "Delivers one-time newsletter confirmation links."

  use Oban.Worker, queue: :mailers, max_attempts: 5
  use APXWeb, :verified_routes

  alias APX.Accounts.UserNotifier
  alias APX.Newsletters

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"consent_id" => consent_id}}) do
    case Newsletters.prepare_confirmation_delivery(consent_id) do
      {:ok, {email, token}} ->
        UserNotifier.deliver_newsletter_confirmation(
          email,
          url(~p"/newsletter/confirm/#{token}")
        )

      {:error, :expired_or_superseded} ->
        {:discard, :expired_or_superseded}
    end
  end
end
