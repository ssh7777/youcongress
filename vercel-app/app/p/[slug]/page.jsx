import { notFound } from 'next/navigation';
import { records } from '../../../lib/db.mjs';
import { pageNumber, sourceHref } from '../../../lib/records.mjs';
import { Pagination, Unavailable } from '../../components';

export const dynamic = 'force-dynamic';

export default async function Statement({params, searchParams}) {
  const {slug} = await params;
  const page = pageNumber((await searchParams).page);
  let statement, result, tallies;
  try {
    statement = await records.statement(slug);
    if (statement) {
      result = await records.quotes(statement.id, page);
      tallies = await records.statementTallies(statement.id);
    }
  } catch { return <Unavailable/>; }
  if (!statement) notFound();
  const path = `/p/${encodeURIComponent(statement.slug)}`;
  const totalVotes = tallies.for + tallies.abstain + tallies.against;

  return <>
    <p className="eyebrow">Policy statement</p><h1>{statement.title}</h1>
    {statement.description && <p className="lede-small">{statement.description}</p>}
    <p className="tallies">
      <span>{`${totalVotes} vote${totalVotes === 1 ? '' : 's'}`}</span>
      <span>{`For ${tallies.for}`}</span>
      <span>{`Abstain ${tallies.abstain}`}</span>
      <span>{`Against ${tallies.against}`}</span>
    </p>
    <p>Source-linked quotations remain separate from their interpretation. Vote totals and verification badges are not inferred from quote counts.</p>
    <a href={`${path}/source-records.csv?page=${page}`}>Download this page’s source records (CSV)</a>
    {result.items.length ? result.items.map(q => <article key={q.id}><h2>{q.author_name || 'Unattributed author'}</h2><blockquote>{q.content}</blockquote>
      {q.date && <p className="meta">Recorded date: {q.date} ({q.date_precision || 'precision unspecified'})</p>}
      <details><summary>Inspect source passage</summary><p className="passage">{q.source_text}</p></details>
      {sourceHref(q.source_url) ? <a href={sourceHref(q.source_url)} rel="noopener noreferrer nofollow">Read original source ↗</a> : <p>Invalid source URL—link disabled.</p>}
    </article>) : <p className="empty">No sourced quotations on this page.</p>}
    <Pagination page={page} hasMore={result.hasMore} path={path}/>
  </>;
}
