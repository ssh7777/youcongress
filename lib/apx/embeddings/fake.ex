defmodule APX.Embeddings.Fake do
  @moduledoc false

  @behaviour APX.Embeddings

  @impl APX.Embeddings
  def embed(_text), do: {:error, :embedding_disabled}
end
