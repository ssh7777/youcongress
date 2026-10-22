defmodule APX.HallsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `APX.Halls` context.
  """

  @doc """
  Generate a hall.
  """
  def hall_fixture(attrs \\ %{}) do
    {:ok, hall} =
      attrs
      |> Enum.into(%{
        name: "some name"
      })
      |> APX.Halls.create_hall()

    hall
  end
end
