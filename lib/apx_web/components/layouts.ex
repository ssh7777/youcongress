defmodule APXWeb.Layouts do
  @moduledoc """
  Define project layouts
  """
  use APXWeb, :html

  import APXWeb.TopHeaderComponent
  import APXWeb.AccountCompletionBanner
  import APXWeb.Components.FooterComponent

  embed_templates "layouts/*"
end
