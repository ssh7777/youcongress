defmodule APX.OpinionsStatementsTest do
  use APX.DataCase
  use Oban.Testing, repo: APX.Repo

  import APX.AccountsFixtures
  import APX.OpinionsFixtures
  import APX.StatementsFixtures

  alias APX.OpinionsStatements
  alias APX.Verifications
  alias APX.Workers.VerificationWorker

  defp disable_automatic_verifications do
    original = Application.fetch_env(:apx, :feature_flags)

    flags =
      case original do
        {:ok, map} when is_map(map) -> Map.put(map, :automatic_verifications, false)
        _ -> %{automatic_verifications: false}
      end

    Application.put_env(:apx, :feature_flags, flags)

    on_exit(fn ->
      case original do
        {:ok, original_value} ->
          Application.put_env(:apx, :feature_flags, original_value)

        :error ->
          Application.delete_env(:apx, :feature_flags)
      end
    end)
  end

  describe "create_opinion_statement/1" do
    test "enqueues relevance verification when creating a verified quote link" do
      user = admin_fixture()
      opinion = opinion_fixture(%{user_id: user.id})
      statement = statement_fixture()

      {:ok, _} =
        Verifications.create_verification(user, %{
          opinion_id: opinion.id,
          user_id: user.id,
          status: :verified,
          comment: "Authentic"
        })

      Oban.Testing.with_testing_mode(:manual, fn ->
        assert {:ok, opinion_statement} =
                 OpinionsStatements.create_opinion_statement(%{
                   opinion_id: opinion.id,
                   statement_id: statement.id,
                   user_id: user.id
                 })

        assert_enqueued(
          worker: VerificationWorker,
          args: %{"subject" => "relevance", "id" => opinion_statement.id}
        )
      end)
    end

    test "does not enqueue relevance verification when automatic verifications are disabled" do
      disable_automatic_verifications()

      user = admin_fixture()
      opinion = opinion_fixture(%{user_id: user.id})
      statement = statement_fixture()

      {:ok, _} =
        Verifications.create_verification(user, %{
          opinion_id: opinion.id,
          user_id: user.id,
          status: :verified,
          comment: "Authentic"
        })

      Oban.Testing.with_testing_mode(:manual, fn ->
        assert {:ok, opinion_statement} =
                 OpinionsStatements.create_opinion_statement(%{
                   opinion_id: opinion.id,
                   statement_id: statement.id,
                   user_id: user.id
                 })

        refute_enqueued(
          worker: VerificationWorker,
          args: %{"subject" => "relevance", "id" => opinion_statement.id}
        )
      end)
    end

    test "does not enqueue relevance verification before the quote is verified" do
      user = user_fixture()
      opinion = opinion_fixture(%{user_id: user.id})
      statement = statement_fixture()

      Oban.Testing.with_testing_mode(:manual, fn ->
        assert {:ok, opinion_statement} =
                 OpinionsStatements.create_opinion_statement(%{
                   opinion_id: opinion.id,
                   statement_id: statement.id,
                   user_id: user.id
                 })

        refute_enqueued(
          worker: VerificationWorker,
          args: %{"subject" => "relevance", "id" => opinion_statement.id}
        )
      end)
    end
  end
end
