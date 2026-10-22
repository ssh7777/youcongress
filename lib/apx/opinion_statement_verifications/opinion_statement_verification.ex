defmodule APX.OpinionStatementVerifications.OpinionStatementVerification do
  @moduledoc """
  Schema for opinion-statement relevance verifications.

  Records whether a quote (opinion) is exactly about a given statement.
  """

  use Ecto.Schema
  import Ecto.Changeset

  alias APX.ContentLimits

  schema "opinion_statement_verifications" do
    field :status, Ecto.Enum,
      values: [
        :verified,
        :ai_verified,
        :ai_unverifiable,
        :endorsed,
        :disputed,
        :unverifiable,
        :unverified
      ]

    field :comment, :string
    field :model, :string, default: "human"

    belongs_to :opinion_statement, APX.OpinionsStatements.OpinionStatement
    belongs_to :user, APX.Accounts.User

    timestamps()
  end

  def changeset(verification, attrs) do
    verification
    |> cast(attrs, [:opinion_statement_id, :user_id, :status, :comment, :model])
    |> validate_required([:opinion_statement_id, :user_id, :status])
    |> ContentLimits.validate_text(:comment, 4_000, 8_000)
    |> ContentLimits.validate_text(:model, 100, 400)
    |> foreign_key_constraint(:opinion_statement_id)
    |> foreign_key_constraint(:user_id)
  end
end
