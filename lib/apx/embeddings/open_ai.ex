defmodule APX.Embeddings.OpenAI do
  @moduledoc """
  OpenAI-backed text embeddings.
  """

  @behaviour APX.Embeddings

  alias APX.OpenAIClient

  @impl APX.Embeddings
  def embed(text) when is_binary(text) do
    case OpenAIClient.embeddings(model: APX.Embeddings.model(), input: text) do
      {:ok, response} -> embedding_from_response(response)
      {:error, reason} -> {:error, reason}
    end
  end

  defp embedding_from_response(%{"data" => [%{"embedding" => embedding} | _]})
       when is_list(embedding),
       do: {:ok, embedding}

  defp embedding_from_response(%{"data" => [%{embedding: embedding} | _]})
       when is_list(embedding),
       do: {:ok, embedding}

  defp embedding_from_response(%{data: [%{"embedding" => embedding} | _]})
       when is_list(embedding),
       do: {:ok, embedding}

  defp embedding_from_response(%{data: [%{embedding: embedding} | _]})
       when is_list(embedding),
       do: {:ok, embedding}

  defp embedding_from_response(response), do: {:error, {:unexpected_response, response}}
end
