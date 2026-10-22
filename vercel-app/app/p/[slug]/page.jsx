import { notFound } from 'next/navigation';
import { records } from '../../../lib/db.mjs';
import { pageNumber, sourceHref } from '../../../lib/records.mjs';
import { currentUser } from '../../../lib/session.mjs';
import { databaseMode, EXTERNAL_DATABASE } from '../../../lib/database-mode.mjs';
import { Pagination, Unavailable } from '../../components';
import { DeleteForm, FormMessage, QuoteEditor, ReconsiderForm, StatementEditor } from '../../form-components';

export const dynamic = 'force-dynamic';

export default async function Statement({params, searchParams}) {
  const {slug} = await params;
  const paramsQuery = await searchParams;
  const page = pageNumber(paramsQuery.page);
  let statement, result, user, currentVote, tallies;
  const canWrite = databaseMode() === EXTERNAL_DATABASE;
  try {
    [statement, user] = await Promise.all([records.statement(slug), currentUser()]);
    if (statement) [result, currentVote, tallies] = await Promise.all([
      records.quotes(statement.id, page),
      records.voteForUser(statement.id, user?.id),
      records.statementTallies(statement.id)
    ]);
  } catch { return <Unavailable/>; }
  if (!statement) notFound();
  const path = `/p/${encodeURIComponent(statement.slug)}`;
  const owner = user?.id === statement.created_by;
  const totalVotes = tallies.for + tallies.abstain + tallies.against;

  return <>
    <p className="eyebrow">Policy statement</p><h1>{statement.title}</h1>
    {statement.description && <p className="lede-small">{statement.description}</p>}
    <FormMessage params={paramsQuery}/>
    <p className="tallies">
      <span>{`${totalVotes} vote${totalVotes === 1 ? '' : 's'}`}</span>
      <span>{`For ${tallies.for}`}</span>
      <span>{`Abstain ${tallies.abstain}`}</span>
      <span>{`Against ${tallies.against}`}</span>
    </p>
    {canWrite && <div className="record-actions"><form method="post" action="/api/mutate" className="vote-form">
      <input type="hidden" name="resource" value="vote"/><input type="hidden" name="operation" value="set"/><input type="hidden" name="statement_id" value={statement.id}/><input type="hidden" name="returnTo" value={path}/>
      <span>Your vote:</span>{['for', 'against', 'abstain'].map(position => <button key={position} type="submit" name="position" value={position} className={currentVote === position ? 'selected' : 'secondary'} aria-pressed={currentVote === position}>{position}</button>)}
    </form></div>}
    {canWrite && owner && <div className="record-actions"><StatementEditor statement={statement} returnTo={path}/><DeleteForm resource="statement" id={statement.id} returnTo="/explore" label="Delete statement"/></div>}
    <p>Source-linked quotations remain separate from their interpretation. Vote totals and verification badges are not inferred from quote counts.</p>
    <a href={`${path}/source-records.csv?page=${page}`}>Download this page’s source records (CSV)</a>
    {canWrite && <div className="record-actions"><QuoteEditor statementId={statement.id} returnTo={path}/><ReconsiderForm statementId={statement.id} returnTo={path}/></div>}
    {result.items.length ? result.items.map(q => <article key={q.id}><h2>{q.author_name || 'Unattributed author'}</h2><blockquote>{q.content}</blockquote>
      {q.date && <p className="meta">Recorded date: {q.date} ({q.date_precision || 'precision unspecified'})</p>}
      <details><summary>Inspect source passage</summary><p className="passage">{q.source_text}</p></details>
      {sourceHref(q.source_url) ? <a href={sourceHref(q.source_url)} rel="noopener noreferrer nofollow">Read original source ↗</a> : <p>Invalid source URL—link disabled.</p>}
      {canWrite && user?.id === q.created_by && <div className="record-actions"><QuoteEditor statementId={statement.id} quote={q} returnTo={path}/><DeleteForm resource="quote" id={q.id} returnTo={path} label="Delete quotation"/></div>}
    </article>) : <p className="empty">No sourced quotations on this page.</p>}
    <Pagination page={page} hasMore={result.hasMore} path={path}/>
  </>;
}
