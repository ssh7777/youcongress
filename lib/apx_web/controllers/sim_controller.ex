defmodule APXWeb.SimController do
  use APXWeb, :controller
  import Phoenix.Controller

  def index(conn, _params) do
    conn
    |> put_root_layout(false)
    |> render(:index, layout: false)
  end
end
