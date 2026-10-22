import Config

env_files =
  case config_env() do
    :dev -> [".env"]
    :test -> [".env.test"]
    _ -> []
  end

if env_files != [] do
  {:ok, env} = Dotenvy.source(env_files ++ [System.get_env()])
  System.put_env(env)
end

# In dev, fall back to fake implementations when no OpenAI key is available.
# This runs after Dotenvy has loaded .env, so the key set there is visible.
if config_env() == :dev and !System.get_env("OPENAI_API_KEY") do
  config :you_congress, :hall_classifier, YouCongress.Halls.ClassificationFake
  config :you_congress, :quotator_implementation, YouCongress.Opinions.Quotes.QuotatorFake

  config :you_congress,
         :fresh_quote_finder_implementation,
         YouCongress.Opinions.Quotes.FreshQuoteFinderFake

  config :you_congress, :title_rewording_implementation, YouCongress.Statements.TitleRewordingFake

  config :you_congress,
         :author_country_inference_implementation,
         YouCongress.Authors.CountryInferenceFake

  config :you_congress, :quote_verifier_implementation, YouCongress.Verifications.VerifierFake

  config :you_congress, :quote_synthesis_implementation, YouCongress.Statements.SynthesisFake
end

# The admin/moderator user that owns AI-generated verifications. Without it, the
# verification workers log and no-op.
config :you_congress, :verification_user_id, System.get_env("VERIFICATION_USER_ID")

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.

# ## Using releases
#
# If you use `mix release`, you need to explicitly enable the server
# by passing the PHX_SERVER=true when you start it:
#
#     PHX_SERVER=true bin/you_congress start
#
# Alternatively, you can use `mix phx.gen.release` to generate a `bin/server`
# script that automatically sets the env var above.
if System.get_env("PHX_SERVER") do
  config :you_congress, YouCongressWeb.Endpoint, server: true
end

config :you_congress, :env, config_env()

if feature_flags_env = System.get_env("FEATURE_FLAGS") do
  config :you_congress,
         :feature_flags,
         YouCongress.FeatureFlags.overrides_from_env(feature_flags_env)
end

config :you_congress, :openai,
  api_key: System.get_env("OPENAI_API_KEY"),
  organization_key: System.get_env("OPENAI_ORGANIZATION_KEY"),
  http_options: [recv_timeout: 60_000]

# Vercel's external rewrites carry HTTP, not WebSocket upgrades. Keep the
# backend's default transport for direct deployments, but allow gateway mode.
liveview_transport = System.get_env("LIVEVIEW_TRANSPORT", "websocket")

unless liveview_transport in ["websocket", "longpoll"] do
  raise "LIVEVIEW_TRANSPORT must be websocket or longpoll"
end

config :you_congress, :liveview_transport, liveview_transport

config :you_congress, :amplitude_api_key, System.get_env("AMPLITUDE_KEY")
config :you_congress, :base_url, System.get_env("BASE_URL")

config :you_congress, :redirect_hosts,
  System.get_env("REDIRECT_HOSTS", "")
  |> String.split(",", trim: true)
  |> Enum.map(&String.trim/1)

if config_env() == :prod do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      For example: ecto://USER:PASS@HOST/DATABASE
      """

  database_ssl_opts =
    if System.get_env("DATABASE_SSL_VERIFY", "true") == "false" do
      [verify: :verify_none]
    else
      ssl_opts = [
        verify: :verify_peer,
        cacertfile: CAStore.file_path(),
        customize_hostname_check: [
          match_fun: :public_key.pkix_verify_hostname_match_fun(:https)
        ]
      ]

      case URI.parse(database_url).host do
        host when is_binary(host) ->
          Keyword.put(ssl_opts, :server_name_indication, String.to_charlist(host))

        _ ->
          ssl_opts
      end
    end

  config :you_congress, YouCongress.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    ssl: if(System.get_env("DATABASE_SSL", "true") == "false", do: false, else: database_ssl_opts)

  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  # Prefer an explicit public URL; platform metadata is a fallback, never a
  # request Host header (which is untrusted). Preview URLs precede production URLs.
  public_url =
    Enum.find_value(
      ["BASE_URL", "PHX_HOST", "VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL",
       "RENDER_EXTERNAL_URL", "RAILWAY_PUBLIC_DOMAIN", "FLY_APP_NAME"],
      fn name ->
        case System.get_env(name) do
          value when is_binary(value) and value != "" ->
            if name == "FLY_APP_NAME", do: "#{value}.fly.dev", else: value

          _ -> nil
        end
      end
    ) || raise "Set BASE_URL or PHX_HOST to this deployment's public address"

  public_url =
    if String.contains?(public_url, "://"), do: public_url, else: "https://#{public_url}"

  public_uri = URI.parse(public_url)

  unless public_uri.scheme in ["http", "https"] and
           is_binary(public_uri.host) and public_uri.host != "" and
           public_uri.path in [nil, "", "/"] and is_nil(public_uri.query) and
           is_nil(public_uri.fragment) and is_nil(public_uri.userinfo) do
    raise "BASE_URL / PHX_HOST must be an HTTP(S) origin without a path, query or credentials"
  end

  config :you_congress, :base_url, String.trim_trailing(public_url, "/")
  port = String.to_integer(System.get_env("PORT") || "4000")

  config :you_congress, YouCongressWeb.Endpoint,
    url: [host: public_uri.host, port: public_uri.port, scheme: public_uri.scheme],
    check_origin: [String.trim_trailing(public_url, "/")],
    http: [
      # Bind on all IPv4 interfaces for container hosts and reverse proxies.
      ip: {0, 0, 0, 0},
      port: port
    ],
    secret_key_base: secret_key_base

  if app_name = System.get_env("FLY_APP_NAME") do
    config :libcluster,
      topologies: [
        fly6pn: [
          strategy: Cluster.Strategy.DNSPoll,
          config: [
            polling_interval: 5_000,
            query: "#{app_name}.internal",
            node_basename: app_name
          ]
        ]
      ]
  end

  config :appsignal, :config,
    revision: System.get_env("APP_REVISION"),
    ignore_errors: [
      "Ecto.NoResultsError"
    ]

  config :you_congress, YouCongress.Mailer,
    adapter: Swoosh.Adapters.Sendgrid,
    api_key: System.get_env("SENDGRID_API_KEY")

  config :swoosh, :api_client, Swoosh.ApiClient.Finch
end

if config_env() in [:dev, :prod] do
  config :you_congress, :twilio_account_sid, System.get_env("TWILIO_ACCOUNT_SID")
  config :you_congress, :twilio_auth_token, System.get_env("TWILIO_AUTH_TOKEN")
  config :you_congress, :twilio_verify_service_sid, System.get_env("TWILIO_VERIFY_SERVICE_SID")

  # X (Twitter) OAuth
  config :you_congress, :x_client_id, System.get_env("X_CLIENT_ID")
  config :you_congress, :x_client_secret, System.get_env("X_CLIENT_SECRET")
  config :you_congress, :x_callback_url, System.get_env("X_CALLBACK_URL")
  config :you_congress, :x_bearer_token, System.get_env("X_BEARER_TOKEN")

  # Google OAuth
  config :you_congress, :google_client_id, System.get_env("GOOGLE_CLIENT_ID")
  config :you_congress, :google_client_secret, System.get_env("GOOGLE_CLIENT_SECRET")
  config :you_congress, :google_callback_url, System.get_env("GOOGLE_CALLBACK_URL")

  # Cloudflare Turnstile
  config :you_congress, :turnstile_site_key, System.get_env("TURNSTILE_SITE_KEY")
  config :you_congress, :turnstile_secret_key, System.get_env("TURNSTILE_SECRET_KEY")
end

if redis_url = System.get_env("MCP_SESSION_REDIS_URL") do
  # Default 2 hours — should match or exceed session_idle_timeout in application.ex
  ttl = (System.get_env("MCP_SESSION_TTL_MS") || "7200000") |> String.to_integer()
  pool_size = (System.get_env("MCP_SESSION_REDIS_POOL") || "5") |> String.to_integer()
  namespace_prefix = System.get_env("FLY_APP_NAME") || "you_congress"

  config :anubis_mcp, :session_store,
    enabled: true,
    adapter: Anubis.Server.Session.Store.Redis,
    redis_url: redis_url,
    namespace: "#{namespace_prefix}:mcp_sessions",
    connection_name: :mcp_session_store,
    pool_size: pool_size,
    ttl: ttl,
    redix_opts: [socket_opts: [:inet6]]
end
