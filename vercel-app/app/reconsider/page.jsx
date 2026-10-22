import Link from 'next/link';
import { records } from '../../lib/db.mjs';
import { pageNumber } from '../../lib/records.mjs';
import { Pagination, Unavailable } from '../components';
export const dynamic = 'force-dynamic';
export const metadata = {title: 'Reconsider'};
export default async function Reconsider({searchParams}) {
  const page = pageNumber((await searchParams).page);
  let result;
  try { result = await records.statementsWithVotes(page); } catch { return <Unavailable/>; }
  return <><p className="eyebrow">Reconsider</p><h1>Where opinion stands</h1>
    <p>Recorded votes on each policy statement, newest activity first. Reconsideration is the point: revisit your positions when new sourced quotations or arguments appear. Tallies are the votes recorded in the database — they are not polls or truth estimates, and casting or delegating votes is not enabled in this build.</p>
    {result.items.length ? <ul className="cards">{result.items.map(s => <li key={s.id}>
      <Link href={`/p/${encodeURIComponent(s.slug)}`}>{s.title}</Link>
      <p className="tallies">
        <span>{`${s.total_votes} vote${s.total_votes === 1 ? '' : 's'}`}</span>
        <span>{`For ${s.for_votes}`}</span>
        <span>{`Abstain ${s.abstain_votes}`}</span>
        <span>{`Against ${s.against_votes}`}</span>
      </p>
    </li>)}</ul> : <p>No votes have been recorded yet.</p>}
    <Pagination page={page} hasMore={result.hasMore} path="/reconsider"/></>;
}
