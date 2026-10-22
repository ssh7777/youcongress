defmodule APX.Repo.Migrations.AddAnswerIdToVotes do
  use Ecto.Migration

  def change do
    alter table(:votes) do
      add :answer_id, :integer
    end
  end
end
