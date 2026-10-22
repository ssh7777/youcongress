defmodule APX.Workers.IntelligenceIngestionWorker do
  @moduledoc """
  Daily Oban job for curated public RSS/Atom feed ingestion.
  """

  use Oban.Worker, queue: :intelligence, max_attempts: 5

  require Logger
  alias APX.Intelligence

  @impl Oban.Worker
  def perform(_job) do
    if Application.get_env(:apx, :intelligence_ingestion_enabled, true) do
      case Intelligence.ingest() do
        {:ok, stats} ->
          Logger.info("APX intelligence ingestion complete: #{inspect(stats)}")
          :ok

        {:error, reason} ->
          Logger.error("APX intelligence ingestion failed: #{inspect(reason)}")
          {:error, reason}
      end
    else
      Logger.info("APX intelligence ingestion is disabled by configuration")
      :ok
    end
  end
end
