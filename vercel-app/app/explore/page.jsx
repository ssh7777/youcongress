import Link from 'next/link';
import { records } from '../../lib/db.mjs';
import { pageNumber, searchTerm } from '../../lib/records.mjs';
import { Pagination, Unavailable } from '../components';
export const dynamic = 'force-dynamic';
export const metadata = {title: 'Explore statements'};
export default async function Explore({searchParams}) {
  const params = await searchParams;
  const q = searchTerm(params.q);
  const page = pageNumber(params.page);
  let result;
  try { result = await records.statements(q, page); } catch { return <Unavailable/>; }
  return <><h1>Explore statements</h1><form action="/explore"><label htmlFor="search">Search statement titles</label><div className="search"><input id="search" name="q" defaultValue={q} maxLength={200} type="search"/><button>Search</button></div></form>
    {result.items.length ? <ul className="cards">{result.items.map(s => <li key={s.id}><Link href={`/p/${encodeURIComponent(s.slug)}`}>{s.title}</Link></li>)}</ul> : <p>No statements match this search.</p>}
    <Pagination page={page} hasMore={result.hasMore} path="/explore" search={q}/></>;
}
