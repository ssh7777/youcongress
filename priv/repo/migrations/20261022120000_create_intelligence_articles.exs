defmodule APX.Repo.Migrations.CreateIntelligenceArticles do
  use Ecto.Migration

  def change do
    create table(:intelligence_articles) do
      add :title, :string, null: false
      add :slug, :string, null: false
      add :canonical_url, :text, null: false
      add :source_name, :string, null: false
      add :source_domain, :string, null: false
      add :category, :string, null: false
      add :summary, :text
      add :published_at, :utc_datetime
      add :ingested_at, :utc_datetime, null: false
      add :impact_rating, :string, null: false, default: "medium"
      add :impact_rationale, :text
      add :executive_brief, :map, null: false, default: %{"bullets" => []}
      add :key_policy_stances, :map, null: false, default: %{"claims" => []}
      add :policy_links, :map, null: false, default: %{"links" => []}

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:intelligence_articles, [:slug])
    create unique_index(:intelligence_articles, [:canonical_url])
    create index(:intelligence_articles, [:category, :published_at])
    create index(:intelligence_articles, [:published_at])
  end
end
