# Run without dependencies or a database: elixir scripts/runtime_config_test.exs
ExUnit.start()

defmodule DeploymentRuntimeConfigTest do
  use ExUnit.Case, async: false

  @variables ~w(BASE_URL PHX_HOST VERCEL_URL VERCEL_PROJECT_PRODUCTION_URL RENDER_EXTERNAL_URL RAILWAY_PUBLIC_DOMAIN FLY_APP_NAME DATABASE_URL DATABASE_SSL_VERIFY SECRET_KEY_BASE FEATURE_FLAGS MCP_SESSION_REDIS_URL)

  setup do
    previous = Map.new(@variables, &{&1, System.get_env(&1)})
    Enum.each(@variables, &System.delete_env/1)
    System.put_env("DATABASE_URL", "ecto://user:pass@db.example.com/app")
    System.put_env("DATABASE_SSL_VERIFY", "false")
    System.put_env("SECRET_KEY_BASE", String.duplicate("a", 64))

    on_exit(fn ->
      Enum.each(previous, fn
        {key, nil} -> System.delete_env(key)
        {key, value} -> System.put_env(key, value)
      end)
    end)
  end

  defp config do
    Config.Reader.read!("config/runtime.exs", env: :prod, target: :host)
  end

  defp endpoint(config), do: config[:you_congress][YouCongressWeb.Endpoint]

  test "Vercel preview metadata beats the production domain" do
    System.put_env("VERCEL_URL", "preview-123.vercel.app")
    System.put_env("VERCEL_PROJECT_PRODUCTION_URL", "production.vercel.app")
    settings = endpoint(config())
    assert settings[:url] == [host: "preview-123.vercel.app", port: 443, scheme: "https"]
    assert settings[:check_origin] == ["https://preview-123.vercel.app"]
  end

  test "explicit public URL takes precedence and preserves its port" do
    System.put_env("BASE_URL", "http://app.example.com:8080/")
    System.put_env("VERCEL_URL", "preview.vercel.app")
    settings = endpoint(config())
    assert settings[:url] == [host: "app.example.com", port: 8080, scheme: "http"]
    assert settings[:check_origin] == ["http://app.example.com:8080"]
  end

  test "Fly metadata is optional and supplies its own domain" do
    System.put_env("PHX_HOST", "app.example.com")
    refute Keyword.has_key?(config(), :libcluster)
    System.delete_env("PHX_HOST")
    System.put_env("FLY_APP_NAME", "my-app")
    assert endpoint(config())[:url][:host] == "my-app.fly.dev"
    assert config()[:libcluster][:topologies][:fly6pn]
  end

  test "missing public origin fails clearly rather than linking to an unrelated site" do
    assert_raise RuntimeError, ~r/Set BASE_URL or PHX_HOST/, fn -> config() end
  end

  test "invalid origins fail at startup" do
    for origin <- ["https://example.com/path", "ftp://example.com", "https://user:pass@example.com", "https://example.com?q=1"] do
      System.put_env("BASE_URL", origin)
      assert_raise RuntimeError, ~r/must be an HTTP/, fn -> config() end
    end
  end
end
