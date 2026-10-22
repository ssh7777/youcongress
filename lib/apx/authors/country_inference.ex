defmodule APX.Authors.CountryInference do
  @moduledoc """
  Infers an author's country from profile details.
  """

  alias APX.Authors.Author
  alias APX.DigitalTwins.OpenAIModel

  @default_model :"gpt-5-nano"

  @type result :: %{
          should_update: boolean(),
          country: binary() | nil,
          reason: binary() | nil
        }

  @callback infer_country(Author.t(), OpenAIModel.t()) :: {:ok, result()} | {:error, binary()}

  @spec infer_country(Author.t(), OpenAIModel.t()) :: {:ok, result()} | {:error, binary()}
  def infer_country(%Author{} = author, model \\ @default_model) do
    implementation().infer_country(author, model)
  end

  defp implementation do
    Application.get_env(
      :apx,
      :author_country_inference_implementation,
      APX.Authors.CountryInferenceAI
    )
  end
end
