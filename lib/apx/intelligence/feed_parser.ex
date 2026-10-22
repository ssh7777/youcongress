defmodule APX.Intelligence.FeedParser do
  @moduledoc """
  Small RSS 2.0 / Atom parser for public feed metadata. It deliberately keeps
  only the title, canonical link, publication time and a short text excerpt.
  """

  @entry_regex ~r/<(?:item|entry)\b[^>]*>.*?<\/(?:item|entry)\s*>/is
  @max_excerpt_length 4_000

  def parse(body, feed) when is_binary(body) and is_map(feed) do
    Regex.scan(@entry_regex, body)
    |> Enum.flat_map(fn [xml] ->
      title = extract_tag(xml, ["title"])
      canonical_url = extract_link(xml) || extract_tag(xml, ["guid", "id"])
      summary = extract_tag(xml, ["description", "summary", "content:encoded", "content"])
      published_at = extract_tag(xml, ["pubDate", "published", "updated", "dc:date"])

      case {title, normalize_url(canonical_url)} do
        {title, url} when is_binary(title) and is_binary(url) ->
          [
            %{
              title: title,
              canonical_url: url,
              summary: summary,
              published_at: parse_datetime(published_at),
              source_name: feed_value(feed, :name),
              category: feed_value(feed, :category)
            }
          ]

        _ ->
          []
      end
    end)
  end

  def parse(_body, _feed), do: []

  defp extract_link(xml) do
    atom_link =
      Regex.scan(~r/<link\b([^>]*)\/?\s*>/is, xml, capture: :all_but_first)
      |> Enum.find_value(fn [attributes] ->
        case Regex.run(~r/\bhref\s*=\s*["']([^"']+)["']/i, attributes, capture: :all_but_first) do
          [url] -> url
          _ -> nil
        end
      end)

    atom_link || extract_tag(xml, ["link"])
  end

  defp extract_tag(xml, tags) do
    Enum.find_value(tags, fn tag ->
      escaped = Regex.escape(tag)
      regex = Regex.compile!("<#{escaped}(?:\\s[^>]*)?>(.*?)</#{escaped}\\s*>", "is")

      case Regex.run(regex, xml, capture: :all_but_first) do
        [value] -> normalize_text(value)
        _ -> nil
      end
    end)
  end

  defp normalize_text(value) when is_binary(value) do
    value
    |> String.replace(~r/<!\[CDATA\[/i, "")
    |> String.replace("]]>", "")
    |> decode_entities()
    |> String.replace(~r/<[^>]*>/u, " ")
    |> String.replace(~r/\s+/u, " ")
    |> String.trim()
    |> case do
      "" -> nil
      text -> String.slice(text, 0, @max_excerpt_length)
    end
  end

  defp normalize_text(_), do: nil

  defp decode_entities(text) do
    Enum.reduce(
      [
        {"&nbsp;", " "},
        {"&quot;", "\""},
        {"&#39;", "'"},
        {"&apos;", "'"},
        {"&lt;", "<"},
        {"&gt;", ">"},
        {"&amp;", "&"}
      ],
      text,
      fn {entity, replacement}, acc -> String.replace(acc, entity, replacement)
    end)
  end

  defp normalize_url(value) when is_binary(value) do
    value = String.trim(value)

    case URI.parse(value) do
      %URI{scheme: scheme, host: host, userinfo: nil} = uri
      when scheme in ["http", "https"] and is_binary(host) and host != "" ->
        URI.to_string(uri)

      _ ->
        nil
    end
  end

  defp normalize_url(_), do: nil

  defp parse_datetime(value) when is_binary(value) do
    value = String.trim(value)

    case DateTime.from_iso8601(value) do
      {:ok, datetime, _offset} ->
        DateTime.from_unix!(DateTime.to_unix(datetime, :second), :second)

      _ ->
        parse_rfc822_datetime(value)
    end
  end

  defp parse_datetime(_), do: nil

  defp parse_rfc822_datetime(value) do
    regex =
      ~r/(?:[A-Za-z]{3},?\s+)?(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})(?:\s+(UT|UTC|GMT|[+-]\d{4}))?/i

    case Regex.run(regex, value) do
      [_, day, month, year, hour, minute, second | rest] ->
        with month_number when is_integer(month_number) <- month_number(month),
             {:ok, date} <- Date.new(to_integer(year), month_number, to_integer(day)),
             {:ok, time} <- Time.new(to_integer(hour), to_integer(minute), to_integer(second)),
             {:ok, datetime} <- DateTime.new(date, time, "Etc/UTC") do
          offset = List.first(rest) || "GMT"
          DateTime.add(datetime, -offset_seconds(offset), :second)
        else
          _ -> nil
        end

      _ ->
        nil
    end
  end

  defp offset_seconds(<<sign, hours::binary-size(2), minutes::binary-size(2)>>)
       when sign in [?+, ?-] do
    multiplier = if sign == ?+, do: 1, else: -1
    multiplier * (to_integer(hours) * 60 + to_integer(minutes)) * 60
  end

  defp offset_seconds(_), do: 0

  defp month_number(month) do
    case String.downcase(month) do
      "jan" -> 1
      "feb" -> 2
      "mar" -> 3
      "apr" -> 4
      "may" -> 5
      "jun" -> 6
      "jul" -> 7
      "aug" -> 8
      "sep" -> 9
      "oct" -> 10
      "nov" -> 11
      "dec" -> 12
      _ -> nil
    end
  end

  defp to_integer(value) do
    case Integer.parse(value) do
      {number, ""} -> number
      _ -> 0
    end
  end

  defp feed_value(feed, key), do: Map.get(feed, key) || Map.get(feed, Atom.to_string(key))
end
