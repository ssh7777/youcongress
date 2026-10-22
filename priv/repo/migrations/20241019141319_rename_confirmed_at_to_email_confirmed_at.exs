defmodule APX.Repo.Migrations.RenameConfirmedAtToEmailConfirmedAt do
  use Ecto.Migration

  def change do
    rename table(:users), :confirmed_at, to: :email_confirmed_at
  end
end
