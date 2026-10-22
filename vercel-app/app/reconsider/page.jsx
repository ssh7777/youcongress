import Link from 'next/link';
import { records } from '../../lib/db.mjs';
import { pageNumber } from '../../lib/records.mjs';
import { currentUser } from '../../lib/session.mjs';
import { databaseMode, EXTERNAL_DATABASE } from '../../lib/database-mode.mjs';
import { DateLabel, Pagination, Unavailable } from '../components';
import { CloseReconsiderationForm, FormMessage } from '../form-components';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Reconsider'};

export default async function Reconsider({searchParams}) {
  const params = await searchParams;
  const page = pageNumber(params.page);
  let result, user;
  const canWrite = databaseMode() === EXTERNAL_DATABASE;
  try {
    [result, user] = await Promise.all([records.reconsiderations(page), currentUser()]);
  } catch { return <Unavailable/>; }

  return <>
    <p className="eyebrow">Evidence can change a decision</p><h1>Reconsider</h1>
    <p>Open requests to revisit a policy statement. Start a request from any statement page; your own open requests can be closed here.</p>
    <FormMessage params={params}/>
    {result.items.length ? result.items.map(item => <article key={item.id}>
      <p className="meta">Opened <DateLabel value={item.created_at}/>{item.requested_by_name ? ` · ${item.requested_by_name}` : ''}</p>
      <h2><Link href={`/p/${encodeURIComponent(item.statement_slug)}`}>{item.statement_title}</Link></h2>
      <p className="passage">{item.rationale}</p>
      {canWrite && user?.id === item.requested_by && <CloseReconsiderationForm id={item.id}/>}
    </article>) : <p className="empty">There are no open reconsiderations.</p>}
    <Pagination page={page} hasMore={result.hasMore} path="/reconsider"/>
  </>;
}
