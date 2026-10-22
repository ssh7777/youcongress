defmodule APX.Embeddings do
  @moduledoc """
  Generates vector embeddings for text.
  """

  @model "text-embedding-3-small"

  @callback embed(binary()) :: {:ok, [float()]} | {:error, term()}

  @spec embed(binary()) :: {:ok, [float()]} | {:error, term()}
  def embed(text) when is_binary(text), do: implementation().embed(text)

  @spec model() :: binary()
  def model, do: @model

  defp implementation do
    Application.get_env(:apx, :embeddings_implementation, APX.Embeddings.OpenAI)
  end
end
