# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :apx,
  ecto_repos: [APX.Repo]

config :apx, APX.Repo, types: APX.PostgrexTypes

# Configures the endpoint
config :apx, APXWeb.Endpoint,
  adapter: Bandit.PhoenixAdapter,
  url: [host: "localhost"],
  render_errors: [
    formats: [html: APXWeb.ErrorHTML, json: APXWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: APX.PubSub,
  live_view: [signing_salt: "cWg2+46f"]

# Configures the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :apx, APX.Mailer, adapter: Swoosh.Adapters.Local

# Curated, source-first public feeds. Keep articles as metadata and short feed
# excerpts; the intelligence pages link readers to the publishers' canonical URLs.
config :apx, :intelligence,
  ingestion_enabled: true,
  max_items_per_feed: 25,
  max_age_days: 120,
  feeds: [
    %{
      name: "CISA Cybersecurity Advisories",
      url: "https://www.cisa.gov/news-events/cybersecurity-advisories.xml",
      category: "cyber_warfare"
    },
    %{
      name: "CISA News",
      url: "https://www.cisa.gov/news-events/news/rss.xml",
      category: "sovereign_technology"
    },
    %{
      name: "European Commission Digital Strategy",
      url: "https://digital-strategy.ec.europa.eu/en/news/rss.xml",
      category: "ai_policy_governance"
    },
    %{
      name: "Lawfare",
      url: "https://www.lawfaremedia.org/rss.xml",
      category: "ai_policy_governance"
    },
    %{
      name: "CSIS Analysis",
      url: "https://www.csis.org/analysis/rss.xml",
      category: "sovereign_technology"
    },
    %{
      name: "MIT Technology Review",
      url: "https://www.technologyreview.com/feed/",
      category: "ai_policy_governance"
    },
    %{
      name: "Defense One",
      url: "https://www.defenseone.com/rss/all/",
      category: "cyber_warfare"
    },
    %{
      name: "U.S. Department of Defense",
      url: "https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=10",
      category: "information_operations"
    }
  ]

# Configure esbuild (the version is required)
config :esbuild,
  version: "0.17.11",
  default: [
    args:
      ~w(js/app.js js/sim.js --bundle --target=es2017 --outdir=../priv/static/assets --external:/fonts/* --external:/images/*),
    cd: Path.expand("../assets", __DIR__),
    env: %{"NODE_PATH" => Path.expand("../deps", __DIR__)}
  ]

# Configure tailwind (the version is required)
config :tailwind,
  version: "3.3.2",
  default: [
    args: ~w(
      --config=tailwind.config.js
      --input=css/app.css
      --output=../priv/static/assets/app.css
    ),
    cd: Path.expand("../assets", __DIR__)
  ]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

oban_plugins =
  [
    # 7 days = 604,800 seconds
    {Oban.Plugins.Pruner, max_age: 604_800},
    Oban.Plugins.Lifeline
  ]

oban_plugins =
  if config_env() == :prod do
    [
      {Oban.Plugins.Cron,
       crontab: [
         # {"0 5,17 * * *", APX.Workers.FreshQuoteDiscoveryWorker},
         {"15 5 * * *", APX.Workers.IntelligenceIngestionWorker},
         {"17 3 * * *", APX.Workers.RateLimitPrunerWorker},
         {"27 3 * * *", APX.Workers.PendingRegistrationActionPrunerWorker}
       ]}
      | oban_plugins
    ]
  else
    oban_plugins
  end

config :apx, Oban,
  repo: APX.Repo,
  plugins: oban_plugins,
  queues: [
    default: 10,
    mailers: 5,
    amplitude: 5,
    verification: 3,
    verification_polling: 5,
    wikidata: 3,
    intelligence: 2
  ]

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
