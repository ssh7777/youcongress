defmodule APX.DelegationsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `APX.Delegations` context.
  """

  alias APX.AuthorsFixtures

  @doc """
  Generate a delegation.
  """
  def delegation_fixture(attrs \\ %{}) do
    {:ok, delegation} =
      attrs
      |> Enum.into(%{
        delegate_id: AuthorsFixtures.author_fixture().id,
        deleguee_id: AuthorsFixtures.author_fixture().id
      })
      |> APX.Delegations.create_delegation()

    delegation
  end
end
