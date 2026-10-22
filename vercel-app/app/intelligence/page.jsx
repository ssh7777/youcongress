import { records } from '../../lib/db.mjs';
import { pageNumber, sourceHref } from '../../lib/records.mjs';
import { Pagination, Unavailable } from '../components';
export const dynamic = 'force-dynamic';
export const metadata = {title: 'Intelligence'};
export default async function Intelligence({searchParams}) {
  const page = pageNumber((await searchParams).page);
  let result;
  try { result = await records.intelligencePosts(page); } catch { return <Unavailable/>; }
  return <><p className="eyebrow">Intelligence</p><h1>Policy intelligence</h1>
    <p>Source-linked posts tracking policy developments relevant to the statements in the database. Each post links to its original source where one is recorded.</p>
    {result.items.length ? result.items.map(p => <article key={p.id}>
      <h2>{p.title}</h2>
      {p.published_at && <p className="meta">Published {p.published_at}</p>}
      {p.summary && <p>{p.summary}</p>}
      {p.body && <p className="passage">{p.body}</p>}
      {sourceHref(p.source_url) ? <a href={sourceHref(p.source_url)} rel="noopener noreferrer nofollow">Read original source ↗</a> : (p.source_url ? <p>Invalid source URL—link disabled.</p> : null)}
    </article>) : <p>No intelligence posts have been published yet.</p>}
    <Pagination page={page} hasMore={result.hasMore} path="/intelligence"/></>;
}
