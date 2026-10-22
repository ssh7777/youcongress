defmodule APX.Wikidata.WikidataFake do
  @moduledoc """
  Fake Wikidata resolver for test and development without network access.
  """

  @behaviour APX.Wikidata

  @impl APX.Wikidata
  @spec get_wikidata_id(String.t()) :: {:ok, String.t() | nil} | {:error, term()}
  def get_wikidata_id(_wikipedia_url), do: {:ok, nil}

  @impl APX.Wikidata
  @spec get_twitter(String.t()) :: {:ok, APX.Wikidata.twitter()} | {:error, term()}
  def get_twitter(_wikidata_id), do: {:ok, %{username: nil, id_str: nil}}
end
