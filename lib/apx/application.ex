defmodule APX.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    Appsignal.Phoenix.LiveView.attach()
    Appsignal.Logger.Handler.add("phoenix")
    topologies = Application.get_env(:libcluster, :topologies) || []

    children = [
      # Start the Telemetry supervisor
      APXWeb.Telemetry,
      # Start the Swoosh supervisor
      # Start the Swoosh supervisor
      {Finch,
       name: Swoosh.Finch,
       pools: %{
         :default => [
           conn_opts: [
             transport_opts: [
               cacertfile: CAStore.file_path()
             ]
           ]
         ]
       }},
      # Start the Ecto repository
      APX.Repo,
      # In-memory ETS cache (per-node, TTL based)
      APX.Cache,
      # Start the PubSub system
      {Phoenix.PubSub, name: APX.PubSub},
      # Start the Endpoint (http/https)
      APXWeb.Endpoint,
      # Oban
      {Oban, Application.fetch_env!(:apx, Oban)},
      # MCP Server
      {APXWeb.MCPServer,
       transport: :streamable_http, session_idle_timeout: :timer.hours(2)},
      # Setup for clustering
      {Cluster.Supervisor, [topologies, [name: APX.ClusterSupervisor]]}
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: APX.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    APXWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
