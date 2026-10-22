defmodule APX.StatementsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `APX.Statements` context.
  """

  @doc """
  Generate a voting.
  """
  def statement_fixture(attrs \\ %{}) do
    {:ok, statement} =
      attrs
      |> Enum.into(%{
        title: Faker.Lorem.sentence()
      })
      |> APX.Statements.create_statement()

    statement
  end
end
