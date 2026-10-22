import Link from 'next/link';
import { records } from '../../lib/db.mjs';
import { pageNumber, searchTerm } from '../../lib/records.mjs';
import { currentUser } from '../../lib/session.mjs';
import { databaseMode, EXTERNAL_DATABASE } from '../../lib/database-mode.mjs';
import { Pagination, Unavailable } from '../components';
import { FormMessage, StatementEditor } from '../form-components';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Explore policy statements'};

export default async function Explore({searchParams}) {
  const params = await searchParams;
  const q = searchTerm(params.q);
  const page = pageNumber(params.page);
  let result, user;
  const canWrite = databaseMode() === EXTERNAL_DATABASE;
  try {
    [result, user] = await Promise.all([records.statements(q, page), currentUser()]);
  } catch { return <Unavailable/>; }

  return <>
    <p className="eyebrow">Public record</p><h1>Explore policy statements</h1>
    <p>Search claims, inspect their sources, and add your own policy statements. Changes are saved in shared PostgreSQL storage.</p>
    <FormMessage params={params}/>
    {canWrite && <><StatementEditor/><p className="meta">{user ? `Writing as ${user.display_name}. Your guest session keeps ownership of your records.` : 'Your first change creates a secure guest session for future edits.'}</p></>}
    <form action="/explore"><label htmlFor="search">Search statement titles</label><div className="search"><input id="search" name="q" defaultValue={q} maxLength={200} type="search"/><button>Search</button></div></form>
    {result.items.length ? <ul className="cards">{result.items.map(s => <li key={s.id}><Link href={`/p/${encodeURIComponent(s.slug)}`}>{s.title}</Link>{user?.id === s.created_by && <span className="owner-badge">Your statement</span>}{s.description && <p>{s.description}</p>}<p className="meta">{s.quote_count} sourced {s.quote_count === 1 ? 'quote' : 'quotes'} · {s.vote_count} {s.vote_count === 1 ? 'vote' : 'votes'}</p></li>)}</ul> : <p className="empty">No policy statements match this search.</p>}
    <Pagination page={page} hasMore={result.hasMore} path="/explore" search={q}/>
  </>;
}
