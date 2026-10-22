import { records } from '../../lib/db.mjs';
import { pageNumber } from '../../lib/records.mjs';
import { currentUser } from '../../lib/session.mjs';
import { databaseMode, EXTERNAL_DATABASE } from '../../lib/database-mode.mjs';
import { DateLabel, Pagination, Unavailable } from '../components';
import { DeleteForm, FormMessage, IntelligenceEditor } from '../form-components';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Intelligence'};

export default async function Intelligence({searchParams}) {
  const params = await searchParams;
  const page = pageNumber(params.page);
  let result, user;
  const canWrite = databaseMode() === EXTERNAL_DATABASE;
  try {
    [result, user] = await Promise.all([records.intelligencePosts(page), currentUser()]);
  } catch { return <Unavailable/>; }

  return <>
    <p className="eyebrow">APX analysis</p><h1>Intelligence</h1>
    <p>Published analysis with visible dates, authorship, and persistent editing for each post’s owner.</p>
    <FormMessage params={params}/>
    {canWrite && <IntelligenceEditor/>}
    {result.items.length ? result.items.map(post => <article key={post.id}>
      <p className="meta"><DateLabel value={post.published_at}/>{post.author_name ? ` · ${post.author_name}` : ''}</p>
      <h2>{post.title}</h2>{post.summary && <p className="lede-small">{post.summary}</p>}
      <p className="passage">{post.content}</p>
      {canWrite && user?.id === post.author_id && <div className="record-actions"><IntelligenceEditor post={post}/><DeleteForm resource="intelligence" id={post.id} returnTo="/intelligence" label="Delete post"/></div>}
    </article>) : <p className="empty">No intelligence posts have been published yet.</p>}
    <Pagination page={page} hasMore={result.hasMore} path="/intelligence"/>
  </>;
}
