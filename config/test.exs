import Config

# Only in tests, remove the complexity from the password hashing algorithm
config :bcrypt_elixir, :log_rounds, 1

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
config :apx, APX.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "apx_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: 10

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :apx, APXWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "y4ccTkzKw/MFuGN1bTNJiWtId10kouKRTM/B0AQ5uFFcVEaAJmF8WnSUJgMrp7YL",
  server: false

# In test we don't send emails; use reserved example addresses for mail assertions.
config :apx, APX.Mailer, adapter: Swoosh.Adapters.Test
config :apx, :contact_email, "contact@example.test"
config :apx, :admin_notification_email, "admin@example.test"
config :apx, :email_from, "noreply@example.test"

# Disable swoosh api client as it is only required for production adapters.
config :swoosh, :api_client, false

# Print only errors during test (suppress warnings from intentional test error paths)
config :logger, level: :error

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

config :apx, Oban, testing: :inline

config :apx, amplitude_api_key: nil

config :apx, :hall_classifier, APX.Halls.ClassificationFake
config :apx, :embeddings_implementation, APX.Embeddings.Fake
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

config :apx, :wikidata_implementation, APX.Wikidata.WikidataFake

config :apx,
       :quote_statement_matcher_implementation,
       APX.Verifications.QuoteStatementMatcherFake

# Disable the MCP session store during tests to avoid runtime warnings.
config :anubis_mcp, :session_store, enabled: false

# Disable Cloudflare Turnstile verification in tests
config :apx, :turnstile_enabled, false

# Keep X login enabled in tests to cover the OAuth code paths
config :apx, :feature_flags, %{log_in_with_x: true}
