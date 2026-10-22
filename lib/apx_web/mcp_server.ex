defmodule APXWeb.MCPServer do
  @moduledoc false
  use Anubis.Server,
    name: "APX",
    version: "1.0.0",
    capabilities: [:tools]

  # Tools: when adding or changing tools, also update the human docs at /mcp-tools
  # (lib/apx_web/controllers/page_html/mcp_tools.html.heex) and the
  # AI-facing tool list in build_llms_txt/0 (page_controller.ex, served at /llms.txt).
  # component(APXWeb.MCPServer.StatementsSearch)
  component(APXWeb.MCPServer.StatementsCreate)
  # Disabled statement populate as it's not working as well as the fresh quote discovery
  # component(APXWeb.MCPServer.StatementPopulate)
  component(APXWeb.MCPServer.StatementsList)
  component(APXWeb.MCPServer.StatementHalls)
  component(APXWeb.MCPServer.StatementAuthors)
  component(APXWeb.MCPServer.StatementsHallsUpdate)
  component(APXWeb.MCPServer.AuthorsSearch)
  component(APXWeb.MCPServer.AuthorsList)
  component(APXWeb.MCPServer.AuthorsCreate)
  component(APXWeb.MCPServer.AuthorsUpdate)
  component(APXWeb.MCPServer.QuotesSearch)
  component(APXWeb.MCPServer.QuotesList)
  component(APXWeb.MCPServer.QuotesRandomUnverified)
  component(APXWeb.MCPServer.QuotesRecentUnverified)
  component(APXWeb.MCPServer.OpinionsShow)
  component(APXWeb.MCPServer.OpinionsCreate)
  component(APXWeb.MCPServer.OpinionsEdit)
  component(APXWeb.MCPServer.OpinionsDelete)
  component(APXWeb.MCPServer.OpinionsStatementsAdd)
  component(APXWeb.MCPServer.OpinionsStatementsRemove)
  component(APXWeb.MCPServer.QuotesVerify)
  component(APXWeb.MCPServer.OpinionStatementsVerify)
  component(APXWeb.MCPServer.VotesVerify)
  component(APXWeb.MCPServer.VotesCreate)
  component(APXWeb.MCPServer.VotesEdit)
end
