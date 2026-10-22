defmodule APXWeb.Components.FooterComponent do
  @moduledoc """
  The application footer.
  """

  use Phoenix.Component
  use APXWeb, :html

  attr :current_user, :any, default: nil

  def footer(assigns) do
    ~H"""
    <footer class="mx-auto max-w-7xl px-4 pb-10 pt-6 text-center text-sm text-apx-muted sm:px-6 lg:px-8">
      <div class="mb-4 flex items-center justify-center gap-3">
        <img src={~p"/favicon.svg"} alt="" aria-hidden="true" class="h-7 w-7" />
        <span class="font-semibold tracking-[0.16em] text-apx-text">APX</span>
        <span class="hidden font-mono text-[0.65rem] tracking-widest text-apx-muted sm:inline">
          POLICY INTELLIGENCE
        </span>
      </div>
      <.link href={~p"/terms"} class="hover:text-apx-cyan">Terms</.link>
      · <.link href={~p"/privacy-policy"} class="hover:text-apx-cyan">Privacy</.link>
      · <.link
        href={~p"/independent-policy-verification-framework"}
        class="hover:text-apx-cyan"
      >Policy framework</.link>
      · <.link href={~p"/intelligence"} class="hover:text-apx-cyan">Intelligence</.link>
      <%= if @current_user do %>
        · <button type="button" data-cookie-settings class="hover:text-apx-cyan">Cookie settings</button>
      <% end %>
      · <.link href={~p"/contact"} class="hover:text-apx-cyan">Contact</.link>
      <p class="mt-4 text-xs text-apx-muted">
        Evidence-linked decision support. Not an official government assessment or standard.
      </p>
    </footer>
    """
  end
end
