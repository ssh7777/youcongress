defmodule APXWeb.NewsletterLive do
  use APXWeb, :live_view

  alias APX.Newsletters

  @impl true
  def mount(_params, session, socket) do
    socket = assign_current_user(socket, session["user_token"])
    user = socket.assigns.current_user
    attrs = if user, do: %{"email" => user.email}, else: %{}

    {:ok,
     socket
     |> assign(:page_title, "Subscribe to APX news")
     |> assign(:sent?, false)
     |> assign(:delivery_error?, false)
     |> assign_form(Newsletters.change_request(attrs))}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <.header class="text-center">
        Subscribe to APX updates
        <:subtitle>Source-linked policy and technology intelligence, with email confirmation.</:subtitle>
      </.header>

      <div :if={@sent?} id="newsletter-confirmation-sent" role="status" class="apx-panel mt-6 p-5">
        If that address can receive mail, APX has sent a confirmation link. It expires after 24 hours.
      </div>

      <div :if={@delivery_error?} role="alert" class="mt-6 rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-red-200">
        The request could not be completed. Please try again later or use the contact form.
      </div>

      <.simple_form
        :if={!@sent?}
        for={@form}
        id="newsletter-form"
        phx-change="validate"
        phx-submit="subscribe"
        class="mt-6 apx-panel p-6"
      >
        <.input field={@form[:email]} type="email" label="Email address" autocomplete="email" required />
        <:actions>
          <.button phx-disable-with="Submitting..." class="w-full">Request subscription</.button>
        </:actions>
      </.simple_form>

      <p class="mt-4 text-center text-xs leading-5 text-apx-muted">
        We use your email only to manage the requested subscription and confirmation. See the
        <.link href={~p"/privacy-policy"} class="text-apx-cyan underline">privacy policy</.link>.
      </p>
    </div>
    """
  end

  @impl true
  def handle_event("validate", %{"newsletter" => params}, socket) do
    changeset =
      params
      |> Newsletters.change_request()
      |> Map.put(:action, :validate)

    {:noreply, assign_form(socket, changeset)}
  end

  def handle_event("subscribe", %{"newsletter" => params}, socket) do
    case Newsletters.request_subscription(params, "newsletter_page", socket.assigns.current_user) do
      {:ok, _consent} ->
        {:noreply,
         socket
         |> assign(:sent?, true)
         |> assign(:delivery_error?, false)
         |> assign_form(Newsletters.change_request())}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign_form(socket, changeset)}

      {:error, _reason} ->
        {:noreply, assign(socket, :delivery_error?, true)}
    end
  end

  defp assign_form(socket, changeset) do
    assign(socket, :form, to_form(changeset, as: "newsletter"))
  end
end
