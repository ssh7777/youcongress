import { records } from '../../lib/db.mjs';
import { pageNumber } from '../../lib/records.mjs';
import { DateLabel, Pagination, Unavailable } from '../components';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Intelligence'};

export default async function Intelligence({searchParams}) {
  const page = pageNumber((await searchParams).page);
  let result;
  try { result = await records.intelligencePosts(page); } catch { return <Unavailable/>; }

  return <>
    <p className="eyebrow">APX analysis</p><h1>Intelligence</h1>
    <p>Published analysis with visible dates, authorship, and surrounding context.</p>
    {result.items.length ? result.items.map(post => <article key={post.id}>
      <p className="meta"><DateLabel value={post.published_at}/>{post.author_name ? ` · ${post.author_name}` : ''}</p>
      <h2>{post.title}</h2>{post.summary && <p className="lede-small">{post.summary}</p>}
      <p className="passage">{post.content}</p>
    </article>) : <p className="empty">No intelligence posts have been published yet.</p>}
    <Pagination page={page} hasMore={result.hasMore} path="/intelligence"/>
  </>;
}
