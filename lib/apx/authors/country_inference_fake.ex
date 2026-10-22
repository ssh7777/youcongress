defmodule APX.Authors.CountryInferenceFake do
  @moduledoc """
  Fake country inference implementation for test and development without OpenAI.
  """

  alias APX.Authors.Author
  alias APX.Authors.CountryInference
  alias APX.DigitalTwins.OpenAIModel

  @behaviour CountryInference

  @impl CountryInference
  @spec infer_country(Author.t(), OpenAIModel.t()) ::
          {:ok, CountryInference.result()} | {:error, binary()}
  def infer_country(%Author{}, _model) do
    {:ok, %{should_update: false, country: nil, reason: "fake"}}
  end
end
