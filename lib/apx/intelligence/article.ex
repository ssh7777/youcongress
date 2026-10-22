defmodule APX.Intelligence.Article do
  @moduledoc """
  A source-linked intelligence item derived from the public metadata in a
  configured RSS or Atom feed. APX stores a short source excerpt and links to the
  publisher; it does not copy full articles.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @categories ~w(
    ai_policy_governance
    sovereign_technology
    cyber_warfare
    information_operations
  )
  @impact_ratings ~w(medium high critical)

  schema "intelligence_articles" do
    field :title, :string
    field :slug, :string
    field :canonical_url, :string
    field :source_name, :string
    field :source_domain, :string
    field :category, :string
    field :summary, :string
    field :published_at, :utc_datetime
    field :ingested_at, :utc_datetime
    field :impact_rating, :string, default: "medium"
    field :impact_rationale, :string
    field :executive_brief, :map, default: %{"bullets" => []}
    field :key_policy_stances, :map, default: %{"claims" => []}
    field :policy_links, :map, default: %{"links" => []}

    timestamps(type: :utc_datetime_usec)
  end

  def categories, do: @categories
  def impact_ratings, do: @impact_ratings

  def changeset(article, attrs) do
    article
    |> cast(attrs, [
      :title,
      :slug,
      :canonical_url,
      :source_name,
      :source_domain,
      :category,
      :summary,
      :published_at,
      :ingested_at,
      :impact_rating,
      :impact_rationale,
      :executive_brief,
      :key_policy_stances,
      :policy_links
    ])
    |> validate_required([
      :title,
      :slug,
      :canonical_url,
      :source_name,
      :source_domain,
      :category,
      :ingested_at,
      :impact_rating
    ])
    |> validate_length(:title, min: 4, max: 500)
    |> validate_length(:canonical_url, max: 2_048)
    |> validate_length(:source_name, max: 160)
    |> validate_length(:summary, max: 4_000)
    |> validate_inclusion(:category, @categories)
    |> validate_inclusion(:impact_rating, @impact_ratings)
    |> unique_constraint(:canonical_url)
    |> unique_constraint(:slug)
  end
end
