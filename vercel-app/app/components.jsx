import Link from 'next/link';
export function Unavailable() {
  return <section role="status"><h1>Records are unavailable</h1><p>The database is not configured, is unreachable, or does not have the existing YouCongress schema. No sample records are being substituted.</p><p>Configure DATABASE_URL in the deployment settings, using a read-only database role. See the native migration guide.</p></section>;
}
export function Pagination({page, hasMore, path, search = ''}) {
  const href = number => `${path}?${new URLSearchParams({page: String(number), ...(search ? {q: search} : {})})}`;
  return <nav className="pagination" aria-label="Pagination">{page > 1 && <Link href={href(page - 1)}>← Previous</Link>}<span>Page {page}</span>{hasMore && <Link href={href(page + 1)}>Next →</Link>}</nav>;
}
