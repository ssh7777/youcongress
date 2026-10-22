defmodule APX.Statements.OpinionCard do
  @moduledoc """
  Represents a statement+vote pair for display in the statements index.
  Used for round-robin ordering where each statement appears once before any repeats.
  """

  defstruct [:id, :statement, :vote, :round, votes_by_answer: %{}, opinion_counts: %{}]

  @type t :: %__MODULE__{
          id: String.t(),
          statement: APX.Statements.Statement.t(),
          vote: APX.Votes.Vote.t(),
          round: integer(),
          votes_by_answer: %{optional(:for | :against | :abstain) => APX.Votes.Vote.t()},
          opinion_counts: %{optional(:for | :against | :abstain) => non_neg_integer()}
        }
end
