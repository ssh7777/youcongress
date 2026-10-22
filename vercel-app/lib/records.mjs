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

// SQL is parameterized and selects only public record fields, never user rows
// beyond public display names. Quote attribution is recorded on the quote itself.
export function repository(query) {
  return {
    async statements(term = '', page = 1) {
      const q = searchTerm(term);
      const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
      const {rows} = await query(`
        SELECT s.id::text, s.slug, s.title
        FROM policy_statements s
        WHERE s.slug IS NOT NULL AND ($1 = '' OR s.title ILIKE $2 ESCAPE '\\')
        ORDER BY s.inserted_at DESC, s.id DESC LIMIT $3 OFFSET $4`,
      [q, pattern, PAGE_SIZE + 1, (pageNumber(page) - 1) * PAGE_SIZE]);
      return {items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE};
    },
    async statement(slug) {
      if (typeof slug !== 'string' || slug.length > 250) return null;
      const {rows} = await query('SELECT id::text, slug, title FROM policy_statements WHERE slug = $1 LIMIT 1', [slug]);
      return rows[0] || null;
    },
    async quotes(id, page = 1) {
      const {rows} = await query(`
        SELECT q.id::text, q.content, q.source_url, q.source_text,
          q.date::text, q.date_precision, q.author_name,
          q.verification_status AS stored_quote_status
        FROM quotes q
        WHERE q.policy_statement_id = $1 AND NULLIF(btrim(q.source_url), '') IS NOT NULL
          AND NULLIF(btrim(q.source_text), '') IS NOT NULL
        ORDER BY q.id DESC LIMIT $2 OFFSET $3`,
      [id, PAGE_SIZE + 1, (pageNumber(page) - 1) * PAGE_SIZE]);
      return {items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE};
    },
    async statementTallies(id) {
      const {rows} = await query(`
        SELECT v.value, count(*)::int AS n
        FROM votes v WHERE v.policy_statement_id = $1
        GROUP BY v.value`, [id]);
      const tallies = {for: 0, abstain: 0, against: 0};
      for (const row of rows) tallies[row.value] = row.n;
      return tallies;
    },
    async statementsWithVotes(page = 1) {
      const {rows} = await query(`
        SELECT s.id::text, s.slug, s.title,
          count(v.id)::int AS total_votes,
          count(*) FILTER (WHERE v.value = 'for')::int AS for_votes,
          count(*) FILTER (WHERE v.value = 'abstain')::int AS abstain_votes,
          count(*) FILTER (WHERE v.value = 'against')::int AS against_votes
        FROM policy_statements s
        LEFT JOIN votes v ON v.policy_statement_id = s.id
        WHERE s.slug IS NOT NULL
        GROUP BY s.id
        ORDER BY max(v.inserted_at) DESC NULLS LAST, s.inserted_at DESC, s.id DESC
        LIMIT $1 OFFSET $2`,
      [PAGE_SIZE + 1, (pageNumber(page) - 1) * PAGE_SIZE]);
      return {items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE};
    },
    async intelligencePosts(page = 1) {
      const {rows} = await query(`
        SELECT p.id::text, p.title, p.summary, p.body, p.source_url,
          p.published_at::text AS published_at
        FROM intelligence_posts p
        ORDER BY p.published_at DESC NULLS LAST, p.id DESC
        LIMIT $1 OFFSET $2`,
      [PAGE_SIZE + 1, (pageNumber(page) - 1) * PAGE_SIZE]);
      return {items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE};
    }
  };
}

// Spreadsheet-safe RFC4180 cells, including leading whitespace/control tricks.
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function sourceRecordsCsv(statement, quotes) {
  const rows = [
    ['statement_id', 'statement_title', 'quote_id', 'author', 'quote', 'source_url', 'source_text', 'date', 'date_precision'],
    ['# This page-only source-record export is not a full verified dataset. Verification histories and stance resolution are not included.'],
    ['# Structured annotations: CC BY 4.0, attribution APX. Third-party quotations retain their original rights.'],
    ...quotes.map(q => [statement.id, statement.title, q.id, q.author_name, q.content, q.source_url, q.source_text, q.date, q.date_precision])
  ];
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
