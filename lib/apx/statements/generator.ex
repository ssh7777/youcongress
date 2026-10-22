defmodule APX.Statements.Generator do
  @moduledoc """
  Main module for generating new statement topics and managing the generation process.
  """

  alias APX.Statements
  alias APX.Statements.GeneratorAI

  def generate do
    with {:ok, %{statement_title: statement_title}} <- generator_implementation().generate() do
      Statements.create_statement(%{title: statement_title})
    end
  end

  defp generator_implementation do
    Application.get_env(:apx, :statement_generator, GeneratorAI)
  end
end
