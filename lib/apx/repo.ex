defmodule APX.Repo do
  use Ecto.Repo,
    otp_app: :apx,
    adapter: Ecto.Adapters.Postgres
end
