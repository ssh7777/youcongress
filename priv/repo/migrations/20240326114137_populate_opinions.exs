defmodule APX.Repo.Migrations.PopulateOpinions do
  use Ecto.Migration

  def up do
    # for vote <- APX.Votes.list_votes_with_opinion() do
    #   {:ok, opinion} =
    #     APX.Opinions.create_opinion(%{
    #       content: vote.opinion,
    #       source_url: vote.source_url,
    #       author_id: vote.author_id,
    #       user_id: nil
    #     })

    #   APX.Votes.update_vote(vote, %{opinion_id: opinion.id})
    # end
  end

  def down, do: nil
end
