defmodule APX.Workers.RateLimitPrunerWorker do
  @moduledoc false

  use Oban.Worker, queue: :default, max_attempts: 3

  import Ecto.Query, warn: false

  alias APX.RateLimiter.RateLimit
  alias APX.Repo

  @retention_days 7

  @impl Oban.Worker
  def perform(_job) do
    cutoff = DateTime.add(DateTime.utc_now(), -@retention_days, :day)
    Repo.delete_all(from(r in RateLimit, where: r.bucket_start < ^cutoff))
    :ok
  end
end
