defmodule APXWeb.IntelligenceHTML do
  use APXWeb, :html

  embed_templates "intelligence_html/*"

  def category_filter_class(active?) do
    base = "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"

    if active? do
      base <> " border-apx-cyan bg-apx-cyan/10 text-apx-cyan"
    else
      base <> " border-apx-line text-apx-muted hover:border-apx-blue hover:text-apx-text"
    end
  end

  def impact_badge_class(rating) do
    tone =
      case rating do
        "critical" -> "border-rose-400/50 bg-rose-500/10 text-rose-200"
        "high" -> "border-amber-400/50 bg-amber-500/10 text-amber-200"
        _ -> "border-apx-blue/50 bg-apx-blue/10 text-blue-200"
      end

    "rounded-full border px-2.5 py-1 text-xs font-semibold " <> tone
  end
end
