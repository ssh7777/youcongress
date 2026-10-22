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
  config :apx, :hall_classifier, APX.Halls.ClassificationFake
  config :apx, :quotator_implementation, APX.Opinions.Quotes.QuotatorFake

  config :apx,
         :fresh_quote_finder_implementation,
         APX.Opinions.Quotes.FreshQuoteFinderFake

  config :apx, :title_rewording_implementation, APX.Statements.TitleRewordingFake

  config :apx,
         :author_country_inference_implementation,
         APX.Authors.CountryInferenceFake

  config :apx, :quote_verifier_implementation, APX.Verifications.VerifierFake

  config :apx, :quote_synthesis_implementation, APX.Statements.SynthesisFake
end

# The admin/moderator user that owns AI-generated verifications. Without it, the
# verification workers log and no-op.
config :apx, :verification_user_id, System.get_env("VERIFICATION_USER_ID")

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
#     PHX_SERVER=true bin/apx start
#
# Alternatively, you can use `mix phx.gen.release` to generate a `bin/server`
# script that automatically sets the env var above.
if System.get_env("PHX_SERVER") do
  config :apx, APXWeb.Endpoint, server: true
end

config :apx, :env, config_env()

if feature_flags_env = System.get_env("FEATURE_FLAGS") do
  config :apx,
         :feature_flags,
         APX.FeatureFlags.overrides_from_env(feature_flags_env)
end

config :apx, :openai,
  api_key: System.get_env("OPENAI_API_KEY"),
  organization_key: System.get_env("OPENAI_ORGANIZATION_KEY"),
  http_options: [recv_timeout: 60_000]

config :apx, :amplitude_api_key, System.get_env("AMPLITUDE_KEY")

base_url = System.get_env("BASE_URL")
contact_email = System.get_env("CONTACT_EMAIL")

config :apx,
  base_url: if(is_binary(base_url), do: String.trim_trailing(base_url, "/")),
  contact_email: contact_email,
  email_from: System.get_env("EMAIL_FROM"),
  admin_notification_email: System.get_env("ADMIN_NOTIFICATION_EMAIL"),
  analytics_domain: System.get_env("PLAUSIBLE_DOMAIN"),
  intelligence_ingestion_enabled:
    System.get_env("INTELLIGENCE_INGESTION_ENABLED", "true") not in ["false", "0", "no"]

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

  config :apx, APX.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    ssl: database_ssl_opts

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

  configured_base_url = System.get_env("BASE_URL")
  parsed_base_url =
    URI.parse(configured_base_url || "https://#{System.get_env("PHX_HOST") || "apx.example"}")

  host = System.get_env("PHX_HOST") || parsed_base_url.host || "apx.example"
  scheme = if parsed_base_url.scheme in ["http", "https"], do: parsed_base_url.scheme, else: "https"
  public_port = parsed_base_url.port || if(scheme == "https", do: 443, else: 80)

  public_origin =
    if public_port in [80, 443],
      do: "#{scheme}://#{host}",
      else: "#{scheme}://#{host}:#{public_port}"

  base_url = String.trim_trailing(configured_base_url || public_origin, "/")
  port = String.to_integer(System.get_env("PORT") || "4000")

  vercel_origins =
    ["VERCEL_URL", "VERCEL_BRANCH_URL"]
    |> Enum.flat_map(fn env_name ->
      case System.get_env(env_name) do
        value when is_binary(value) and value != "" ->
          candidate = if String.contains?(value, "://"), do: value, else: "https://" <> value

          case URI.parse(candidate) do
            %URI{scheme: "https", host: vercel_host} when is_binary(vercel_host) ->
              ["https://#{vercel_host}"]

            _ ->
              []
          end

        _ ->
          []
      end
    end)

  config :apx, :base_url, base_url

  config :apx, APXWeb.Endpoint,
    url: [host: host, port: public_port, scheme: scheme],
    http: [
      # Bind on all interfaces for containers and managed hosting platforms.
      ip: {0, 0, 0, 0, 0, 0, 0, 0},
      port: port
    ],
    # Accept the configured public deployment plus Arena preview and Vercel
    # preview origins for LiveView WebSocket connections.
    check_origin: [public_origin, ~r/^https:\/\/[A-Za-z0-9.-]+\.e2b\.app$/] ++ vercel_origins,
    secret_key_base: secret_key_base

  # Clustering is optional. Non-Fly deployments do not need a Fly DNS
  # topology just to start the Phoenix application.
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
  else
    config :libcluster, topologies: []
  end

  config :appsignal, :config,
    revision: System.get_env("APP_REVISION"),
    ignore_errors: [
      "Ecto.NoResultsError"
    ]

  config :apx, APX.Mailer,
    adapter: Swoosh.Adapters.Sendgrid,
    api_key: System.get_env("SENDGRID_API_KEY")

  config :swoosh, :api_client, Swoosh.ApiClient.Finch
end

if config_env() in [:dev, :prod] do
  config :apx, :twilio_account_sid, System.get_env("TWILIO_ACCOUNT_SID")
  config :apx, :twilio_auth_token, System.get_env("TWILIO_AUTH_TOKEN")
  config :apx, :twilio_verify_service_sid, System.get_env("TWILIO_VERIFY_SERVICE_SID")

  # X (Twitter) OAuth
  config :apx, :x_client_id, System.get_env("X_CLIENT_ID")
  config :apx, :x_client_secret, System.get_env("X_CLIENT_SECRET")
  config :apx, :x_callback_url, System.get_env("X_CALLBACK_URL")
  config :apx, :x_bearer_token, System.get_env("X_BEARER_TOKEN")

  # Google OAuth
  config :apx, :google_client_id, System.get_env("GOOGLE_CLIENT_ID")
  config :apx, :google_client_secret, System.get_env("GOOGLE_CLIENT_SECRET")
  config :apx, :google_callback_url, System.get_env("GOOGLE_CALLBACK_URL")

  # Cloudflare Turnstile
  config :apx, :turnstile_site_key, System.get_env("TURNSTILE_SITE_KEY")
  config :apx, :turnstile_secret_key, System.get_env("TURNSTILE_SECRET_KEY")
end

if redis_url = System.get_env("MCP_SESSION_REDIS_URL") do
  # Default 2 hours — should match or exceed session_idle_timeout in application.ex
  ttl = (System.get_env("MCP_SESSION_TTL_MS") || "7200000") |> String.to_integer()
  pool_size = (System.get_env("MCP_SESSION_REDIS_POOL") || "5") |> String.to_integer()
  namespace_prefix = System.get_env("FLY_APP_NAME") || "apx"

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
