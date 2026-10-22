defmodule YouCongressWeb.Plugs.DomainRedirectTest do
  use YouCongressWeb.ConnCase
  alias YouCongressWeb.Plugs.DomainRedirect

  setup do
    previous = Application.get_env(:you_congress, :redirect_hosts)
    Application.put_env(:you_congress, :redirect_hosts, ["old.example.com"])

    on_exit(fn ->
      if previous do
        Application.put_env(:you_congress, :redirect_hosts, previous)
      else
        Application.delete_env(:you_congress, :redirect_hosts)
      end
    end)
  end

  test "configured aliases use the endpoint origin and preserve path and query", %{conn: conn} do
    conn = %{conn | host: "old.example.com", request_path: "/search", query_string: "q=test&page=2"}
    conn = DomainRedirect.call(conn, [])

    assert conn.status == 301
    assert conn.halted
    assert get_resp_header(conn, "location") == [
             YouCongressWeb.Endpoint.url() <> "/search?q=test&page=2"
           ]
  end

  test "old production domains and deployment hosts are not redirected by default", %{conn: conn} do
    for host <- ["apx-lake.vercel.app", "www.apx-lake.vercel.app", "youcongress.com",
                 "www.youcongress.com", "preview.vercel.app", "example.com"] do
      result = DomainRedirect.call(%{conn | host: host}, [])
      refute result.halted
      assert result.status == nil
    end
  end

  test "canonical host never redirects to itself", %{conn: conn} do
    host = URI.parse(YouCongressWeb.Endpoint.url()).host
    Application.put_env(:you_congress, :redirect_hosts, [host])
    refute DomainRedirect.call(%{conn | host: host}, []).halted
  end
end
