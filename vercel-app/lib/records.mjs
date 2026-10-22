export const PAGE_SIZE = 24;
export function pageNumber(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? Math.min(number, 10000) : 1;
}
export function searchTerm(value) {
  return typeof value === 'string' ? value.trim().slice(0, 200) : '';
}
export function sourceHref(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

// SQL is parameterized and selects only public record fields, never user rows.
// A quote's relation is opinions_statements, not the author's latest vote.
export function repository(query) {
  return {
    async statements(term = '', page = 1) {
      const q = searchTerm(term);
      const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
      const {rows} = await query(`
        SELECT s.id::text, s.slug, s.title
        FROM statements s
        WHERE s.slug IS NOT NULL AND ($1 = '' OR s.title ILIKE $2 ESCAPE '\\')
        ORDER BY s.inserted_at DESC, s.id DESC LIMIT $3 OFFSET $4`,
      [q, pattern, PAGE_SIZE + 1, (pageNumber(page) - 1) * PAGE_SIZE]);
      return {items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE};
    },
    async statement(slug) {
      if (typeof slug !== 'string' || slug.length > 250) return null;
      const {rows} = await query('SELECT id::text, slug, title FROM statements WHERE slug = $1 LIMIT 1', [slug]);
      return rows[0] || null;
    },
    async quotes(id, page = 1) {
      const {rows} = await query(`
        SELECT o.id::text, o.content, o.source_url, o.source_text,
          o.date::text, o.date_precision, a.name AS author_name,
          o.verification_status AS stored_quote_status,
          os.verification_status AS stored_relevance_status
        FROM opinions_statements os
        JOIN opinions o ON o.id = os.opinion_id
        LEFT JOIN authors a ON a.id = o.author_id
        WHERE os.statement_id = $1 AND NULLIF(btrim(o.source_url), '') IS NOT NULL
          AND NULLIF(btrim(o.source_text), '') IS NOT NULL
        ORDER BY o.id DESC LIMIT $2 OFFSET $3`,
      [id, PAGE_SIZE + 1, (pageNumber(page) - 1) * PAGE_SIZE]);
      return {items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE};
    }
  };
}

// Spreadsheet-safe RFC4180 cells, including leading whitespace/control tricks.
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function sourceRecordsCsv(statement, quotes) {
  const rows = [
    ['statement_id', 'statement_title', 'opinion_id', 'author', 'quote', 'source_url', 'source_text', 'date', 'date_precision'],
    ['# This page-only source-record export is not the full Phoenix verified dataset. Verification histories and stance resolution are not included.'],
    ['# Structured annotations: CC BY 4.0, attribution YouCongress. Third-party quotations retain their original rights.'],
    ...quotes.map(q => [statement.id, statement.title, q.id, q.author_name, q.content, q.source_url, q.source_text, q.date, q.date_precision])
  ];
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
