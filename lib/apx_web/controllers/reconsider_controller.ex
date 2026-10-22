defmodule APXWeb.ReconsiderController do
  use APXWeb, :controller

  alias APX.Reconsiderations

  def redirect_to_creator(conn, %{"slug" => slug}) do
    reconsideration = Reconsiderations.get_reconsideration_by_slug!(slug)

    conn
    |> put_status(:moved_permanently)
    |> redirect(to: ~p"/@#{reconsideration.creator.username}/r/#{reconsideration.slug}")
  end
end
