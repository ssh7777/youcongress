defmodule APX.Halls.ClassificationBehaviour do
  @moduledoc """
  This module defines the behaviour for classifying a text.
  """

  alias APX.DigitalTwins.OpenAIModel

  @callback classify(binary, OpenAIModel.t()) ::
              {:ok, %{tags: [binary], cost: number}} | {:error, binary}
end
