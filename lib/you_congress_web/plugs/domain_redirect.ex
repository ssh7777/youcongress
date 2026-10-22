defmodule YouCongressWeb.Plugs.DomainRedirect do
  @moduledoc """
  Redirects explicitly configured aliases to the endpoint's public origin.
  Unknown hosts are left alone; deployments never inherit another site's domain.
  """

  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    aliases = Application.get_env(:you_congress, :redirect_hosts, [])
    canonical_url = YouCongressWeb.Endpoint.url()
    canonical_host = URI.parse(canonical_url).host

    if conn.host in aliases and conn.host != canonical_host do
      conn
      |> put_resp_header("location", canonical_url <> full_path(conn))
      |> resp(301, "")
      |> halt()
    else
      conn
    end
  end

  defp full_path(conn) do
    case conn.query_string do
      "" -> conn.request_path
      query_string -> "#{conn.request_path}?#{query_string}"
    end
  end
end
