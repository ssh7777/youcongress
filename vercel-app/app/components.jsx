import Link from 'next/link';

export function Unavailable() {
  return <section role="status"><h1>Records are temporarily unavailable</h1><p>The APX PostgreSQL database could not be initialized or reached. No sample records are being substituted.</p><p>Check the deployment health endpoint and database migration logs before retrying.</p></section>;
}

export function Pagination({page, hasMore, path, search = ''}) {
  const href = number => `${path}?${new URLSearchParams({page: String(number), ...(search ? {q: search} : {})})}`;
  return <nav className="pagination" aria-label="Pagination">{page > 1 && <Link href={href(page - 1)}>← Previous</Link>}<span>Page {page}</span>{hasMore && <Link href={href(page + 1)}>Next →</Link>}</nav>;
}

export function DateLabel({value}) {
  if (!value) return null;
  return <time dateTime={value}>{value.slice(0, 10)}</time>;
}
