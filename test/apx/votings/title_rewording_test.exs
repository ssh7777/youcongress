defmodule APX.Statements.TitleRewordingTest do
  use APX.DataCase

  alias APX.Statements.TitleRewording

  describe "title_rewording" do
    @tag :openai_api
    test "generate_rewordings/2 returns three questions" do
      assert {:ok, questions, cost} =
               TitleRewording.generate_rewordings("Nuclear energy", :"gpt-4o")

      assert length(questions) == 3
      assert cost == 0.0032900000000000004
    end
  end
end
