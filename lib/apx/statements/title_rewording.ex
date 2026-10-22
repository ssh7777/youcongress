defmodule APX.Statements.TitleRewording do
  @moduledoc """
  Provides functionality for generating alternative wordings of statement titles.
  """

  def generate_rewordings(prompt, model) do
    implementation().generate_rewordings(prompt, model)
  end

  defp implementation do
    Application.get_env(
      :apx,
      :title_rewording_implementation,
      APX.Statements.TitleRewordingAI
    )
  end
end
