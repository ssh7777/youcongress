defmodule Mix.Tasks.Intelligence.Ingest do
  use Mix.Task

  @shortdoc "Fetch and curate the configured APX intelligence RSS feeds"

  @impl Mix.Task
  def run(_args) do
    Mix.Task.run("app.start")

    case APX.Intelligence.ingest() do
      {:ok, stats} ->
        Mix.shell().info("APX intelligence ingestion complete: #{inspect(stats)}")

      {:error, reason} ->
        Mix.raise("APX intelligence ingestion failed: #{inspect(reason)}")
    end
  end
end
