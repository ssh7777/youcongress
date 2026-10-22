import { ConfirmButton } from './confirm-button';

export function FormMessage({params}) {
  const error = typeof params.error === 'string' ? params.error.slice(0, 300) : '';
  const success = typeof params.success === 'string' ? params.success.slice(0, 300) : '';
  if (!error && !success) return null;
  return <p className={error ? 'form-message error' : 'form-message success'} role="status">{error || success}</p>;
}

function Hidden({resource, operation, id, returnTo}) {
  return <><input type="hidden" name="resource" value={resource}/><input type="hidden" name="operation" value={operation}/>{id && <input type="hidden" name="id" value={id}/>}<input type="hidden" name="returnTo" value={returnTo}/></>;
}

export function StatementEditor({statement, returnTo = '/explore'}) {
  const editing = Boolean(statement);
  return <details className="editor" open={!editing && undefined}><summary>{editing ? 'Edit your policy statement' : 'Create a policy statement'}</summary><form method="post" action="/api/mutate">
    <Hidden resource="statement" operation={editing ? 'update' : 'create'} id={statement?.id} returnTo={returnTo}/>
    <label>Statement title<input name="title" defaultValue={statement?.title || ''} required minLength={3} maxLength={500}/></label>
    <label>Description<textarea name="description" defaultValue={statement?.description || ''} maxLength={5000} rows={4}/></label>
    <button type="submit">{editing ? 'Save changes' : 'Create statement'}</button>
  </form></details>;
}

export function QuoteEditor({statementId, quote, returnTo}) {
  const editing = Boolean(quote);
  return <details className="editor"><summary>{editing ? 'Edit your quotation' : 'Add a sourced quotation'}</summary><form method="post" action="/api/mutate">
    <Hidden resource="quote" operation={editing ? 'update' : 'create'} id={quote?.id} returnTo={returnTo}/><input type="hidden" name="statement_id" value={statementId}/>
    <label>Author (optional)<input name="author_name" defaultValue={quote?.author_name || ''} maxLength={300}/></label>
    <label>Quotation<textarea name="content" defaultValue={quote?.content || ''} required maxLength={10000} rows={5}/></label>
    <label>Source URL<input name="source_url" type="url" defaultValue={quote?.source_url || ''} required maxLength={2000}/></label>
    <label>Original source passage<textarea name="source_text" defaultValue={quote?.source_text || ''} required maxLength={20000} rows={5}/></label>
    <button type="submit">{editing ? 'Save quotation' : 'Add quotation'}</button>
  </form></details>;
}

export function IntelligenceEditor({post}) {
  const editing = Boolean(post);
  return <details className="editor" open={!editing && undefined}><summary>{editing ? 'Edit your intelligence post' : 'Publish an intelligence post'}</summary><form method="post" action="/api/mutate">
    <Hidden resource="intelligence" operation={editing ? 'update' : 'create'} id={post?.id} returnTo="/intelligence"/>
    <label>Post title<input name="title" defaultValue={post?.title || ''} required minLength={3} maxLength={500}/></label>
    <label>Summary<textarea name="summary" defaultValue={post?.summary || ''} maxLength={2000} rows={3}/></label>
    <label>Analysis<textarea name="content" defaultValue={post?.content || ''} required maxLength={30000} rows={7}/></label>
    <button type="submit">{editing ? 'Save changes' : 'Publish post'}</button>
  </form></details>;
}

export function ReconsiderForm({statementId, returnTo}) {
  return <details className="editor"><summary>Request reconsideration</summary><form method="post" action="/api/mutate">
    <Hidden resource="reconsideration" operation="create" returnTo={returnTo}/><input type="hidden" name="statement_id" value={statementId}/>
    <label>Why should this statement be revisited?<textarea name="rationale" required minLength={3} maxLength={10000} rows={4}/></label>
    <button type="submit">Open reconsideration</button>
  </form></details>;
}

export function DeleteForm({resource, id, returnTo, label = 'Delete'}) {
  return <form className="inline-form" method="post" action="/api/mutate"><Hidden resource={resource} operation="delete" id={id} returnTo={returnTo}/><ConfirmButton message="Delete this record permanently?">{label}</ConfirmButton></form>;
}

export function CloseReconsiderationForm({id}) {
  return <form className="inline-form" method="post" action="/api/mutate"><Hidden resource="reconsideration" operation="close" id={id} returnTo="/reconsider"/><button type="submit" className="secondary">Close request</button></form>;
}
