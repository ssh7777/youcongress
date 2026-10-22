defmodule APXWeb.TopHeaderComponent do
  @moduledoc """
  The top header component.
  """

  use Phoenix.Component
  use APXWeb, :html

  alias APXWeb.ReturnTo

  defdelegate author_path(path), to: APXWeb.AuthorLive.Show, as: :author_path

  def top_header(assigns) do
    ~H"""
    <header class="px-4 sm:px-6 lg:px-8">
      <div class="flex flex-wrap items-center justify-between gap-x-4 border-b border-zinc-100 py-3 text-sm">
        <div class="flex items-center gap-4">
          <.link href={~p"/"} class="inline-flex items-center" aria-label="APX home">
            <img src={~p"/logo.svg"} alt="APX — Policy Intelligence" class="h-9 w-auto" />
          </.link>
        </div>
        <!-- Desktop Navigation -->
        <div class="hidden md:flex text-sm items-center gap-6 leading-6 text-zinc-900">
          <.link
            :if={@current_user && APX.Accounts.sign_up_complete?(@current_user)}
            href={~p"/"}
            class="px-3 py-2 hover:text-zinc-700 transition-colors"
          >
            Home
          </.link>
          <.link href={~p"/explore"} class="px-3 py-2 hover:text-zinc-700 transition-colors">
            Explore
          </.link>
          <.link href={~p"/intelligence"} class="px-3 py-2 hover:text-zinc-700 transition-colors">
            Intelligence
          </.link>
          <.link
            :if={
              @current_user && APX.Accounts.sign_up_complete?(@current_user) &&
                APX.Accounts.Permissions.can_create_reconsideration?(@current_user)
            }
            href={~p"/reconsider"}
            class="px-3 py-2 hover:text-zinc-700 transition-colors"
          >
            Reconsider
          </.link>
          <.link
            :if={!@current_user || APX.Accounts.sign_up_complete?(@current_user)}
            href={~p"/about"}
            class="px-3 py-2 hover:text-zinc-700 transition-colors"
          >
            About
          </.link>

          <%= if @current_user do %>
            <.link
              :if={APX.Accounts.sign_up_complete?(@current_user)}
              href={author_path(@current_user.author)}
              class="px-3 py-2 hover:text-zinc-700 transition-colors"
            >
              Profile
            </.link>
            <.link
              href={~p"/log_out"}
              method="delete"
              class="px-3 py-2 hover:text-zinc-700 transition-colors"
            >
              Log out
            </.link>
          <% else %>
            <.link
              href={ReturnTo.sign_up_path(@return_to)}
              class="px-3 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-700 transition-colors"
            >
              Sign up
            </.link>
          <% end %>
        </div>
        <!-- Mobile Navigation (Optimized Touch Targets) -->
        <div class="md:hidden flex max-w-full flex-col items-end gap-3 text-sm">
          <div class="flex flex-wrap items-center gap-4">
            <.link
              href={~p"/explore"}
              class="px-1 py-3 text-zinc-900 hover:text-zinc-700 hover:bg-zinc-50 rounded-md transition-colors min-w-[44px] text-center"
            >
              Explore
            </.link>
            <.link
              href={~p"/intelligence"}
              class="px-1 py-3 text-zinc-900 hover:text-zinc-700 hover:bg-zinc-50 rounded-md transition-colors min-w-[44px] text-center"
            >
              Intelligence
            </.link>
            <.link
              :if={
                @current_user && APX.Accounts.sign_up_complete?(@current_user) &&
                  APX.Accounts.Permissions.can_create_reconsideration?(@current_user)
              }
              href={~p"/reconsider"}
              class="px-1 py-3 text-zinc-900 hover:text-zinc-700 hover:bg-zinc-50 rounded-md transition-colors min-w-[44px] text-center"
            >
              Create
            </.link>
            <.link
              :if={!@current_user || APX.Accounts.sign_up_complete?(@current_user)}
              href={~p"/about"}
              class="px-1 py-3 text-zinc-900 hover:text-zinc-700 hover:bg-zinc-50 rounded-md transition-colors min-w-[44px] text-center"
            >
              About
            </.link>
            <%= if @current_user do %>
              <.link
                :if={APX.Accounts.sign_up_complete?(@current_user)}
                href={author_path(@current_user.author)}
                class="px-1 py-3 text-zinc-900 hover:text-zinc-700 hover:bg-zinc-50 rounded-md transition-colors min-w-[44px] text-center"
              >
                Profile
              </.link>
              <.link
                href={~p"/log_out"}
                method="delete"
                class="px-1 py-3 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-50 rounded-md transition-colors min-w-[44px] text-center"
              >
                Logout
              </.link>
            <% else %>
              <.link
                href={ReturnTo.sign_up_path(@return_to)}
                class="px-1 py-3 rounded-md hover:bg-zinc-700 transition-colors min-w-[44px] text-center"
              >
                Sign up
              </.link>
            <% end %>
          </div>
        </div>
      </div>
    </header>
    """
  end

end
