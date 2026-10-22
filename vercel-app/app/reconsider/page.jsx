import Link from 'next/link';
import { records } from '../../lib/db.mjs';
import { pageNumber } from '../../lib/records.mjs';
import { DateLabel, Pagination, Unavailable } from '../components';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Reconsider'};

export default async function Reconsider({searchParams}) {
  const page = pageNumber((await searchParams).page);
  let result;
  try { result = await records.reconsiderations(page); } catch { return <Unavailable/>; }

  return <>
    <p className="eyebrow">Evidence can change a decision</p><h1>Reconsider</h1>
    <p>Open requests to revisit a policy statement. Each request stays connected to its underlying public record and stated rationale.</p>
    {result.items.length ? result.items.map(item => <article key={item.id}>
      <p className="meta">Opened <DateLabel value={item.created_at}/>{item.requested_by_name ? ` · ${item.requested_by_name}` : ''}</p>
      <h2><Link href={`/p/${encodeURIComponent(item.statement_slug)}`}>{item.statement_title}</Link></h2>
      <p className="passage">{item.rationale}</p>
    </article>) : <p className="empty">There are no open reconsiderations.</p>}
    <Pagination page={page} hasMore={result.hasMore} path="/reconsider"/>
  </>;
}
