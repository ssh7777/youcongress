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

// SQL is parameterized and selects only public fields, never account credentials.
export function repository(query) {
  return {
    async statements(term = '', page = 1) {
      const q = searchTerm(term);
      const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
      const {rows} = await query(`
        SELECT s.id::text, s.slug, s.title, s.description,
          (SELECT count(*)::int FROM quotes q WHERE q.statement_id = s.id) AS quote_count,
          (SELECT count(*)::int FROM votes v WHERE v.statement_id = s.id) AS vote_count
        FROM policy_statements s
        WHERE ($1 = '' OR s.title ILIKE $2 ESCAPE '\\')
        ORDER BY s.created_at DESC, s.id DESC LIMIT $3 OFFSET $4`,
      [q, pattern, PAGE_SIZE + 1, (pageNumber(page) - 1) * PAGE_SIZE]);
      return {items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE};
    },
    async statement(slug) {
      if (typeof slug !== 'string' || slug.length > 250) return null;
      const {rows} = await query('SELECT id::text, slug, title, description FROM policy_statements WHERE slug = $1 LIMIT 1', [slug]);
      return rows[0] || null;
    },
    async quotes(id, page = 1) {
      const {rows} = await query(`
        SELECT q.id::text, q.content, q.source_url, q.source_text,
          q.quote_date::text AS date, q.date_precision, q.author_name,
          q.verification_status AS stored_quote_status
        FROM quotes q
        WHERE q.statement_id = $1
        ORDER BY q.id DESC LIMIT $2 OFFSET $3`,
      [id, PAGE_SIZE + 1, (pageNumber(page) - 1) * PAGE_SIZE]);
      return {items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE};
    },
    async intelligencePosts(page = 1) {
      const {rows} = await query(`
        SELECT p.id::text, p.slug, p.title, p.summary, p.content,
          p.published_at::text AS published_at, u.display_name AS author_name
        FROM intelligence_posts p
        LEFT JOIN users u ON u.id = p.author_id
        WHERE p.status = 'published' AND p.published_at IS NOT NULL AND p.published_at <= now()
        ORDER BY p.published_at DESC, p.id DESC LIMIT $1 OFFSET $2`,
      [PAGE_SIZE + 1, (pageNumber(page) - 1) * PAGE_SIZE]);
      return {items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE};
    },
    async reconsiderations(page = 1) {
      const {rows} = await query(`
        SELECT r.id::text, r.rationale, r.created_at::text,
          s.slug AS statement_slug, s.title AS statement_title,
          u.display_name AS requested_by_name
        FROM reconsiderations r
        JOIN policy_statements s ON s.id = r.statement_id
        LEFT JOIN users u ON u.id = r.requested_by
        WHERE r.status = 'open'
        ORDER BY r.created_at DESC, r.id DESC LIMIT $1 OFFSET $2`,
      [PAGE_SIZE + 1, (pageNumber(page) - 1) * PAGE_SIZE]);
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
    ['statement_id', 'statement_title', 'quote_id', 'author', 'quote', 'source_url', 'source_text', 'date', 'date_precision'],
    ['# This page-only export contains the source records visible on this APX statement page.'],
    ['# Structured annotations: CC BY 4.0, attribution APX. Third-party quotations retain their original rights.'],
    ...quotes.map(q => [statement.id, statement.title, q.id, q.author_name, q.content, q.source_url, q.source_text, q.date, q.date_precision])
  ];
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
