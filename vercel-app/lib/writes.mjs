import { writeQuery } from './db.mjs';
import { choiceField, idField, ownedResult, slugFor, textField, urlField, WriteError } from './validation.mjs';

function statementInput(form) {
  return [
    textField(form, 'title', {min: 3, max: 500, label: 'Statement title'}),
    textField(form, 'description', {max: 5000, label: 'Description'})
  ];
}

function quoteInput(form) {
  return [
    textField(form, 'content', {min: 1, max: 10000, label: 'Quote'}),
    textField(form, 'author_name', {max: 300, label: 'Author'}) || null,
    urlField(form, 'source_url'),
    textField(form, 'source_text', {min: 1, max: 20000, label: 'Source passage'})
  ];
}

function intelligenceInput(form) {
  return [
    textField(form, 'title', {min: 3, max: 500, label: 'Post title'}),
    textField(form, 'summary', {max: 2000, label: 'Summary'}),
    textField(form, 'content', {min: 1, max: 30000, label: 'Analysis'})
  ];
}

async function createStatement(form, user) {
  const [title, description] = statementInput(form);
  const slug = slugFor(title);
  const result = await writeQuery(`INSERT INTO policy_statements(slug,title,description,created_by)
    VALUES ($1,$2,$3,$4) RETURNING id::text,slug,title,description,created_by::text`, [slug, title, description, user.id]);
  return {record: result.rows[0], returnTo: `/p/${encodeURIComponent(slug)}`, message: 'Policy statement created.'};
}

async function updateStatement(form, user) {
  const id = idField(form, 'id');
  const [title, description] = statementInput(form);
  const result = await writeQuery(`UPDATE policy_statements SET title=$2,description=$3,updated_at=now()
    WHERE id=$1 AND created_by=$4 RETURNING id::text,slug,title,description,created_by::text`, [id, title, description, user.id]);
  return ownedResult(result, `/p/${encodeURIComponent(result.rows[0]?.slug || '')}`, 'Policy statement updated.');
}

async function deleteStatement(form, user) {
  const id = idField(form, 'id');
  // Never cascade-delete another guest's contributions with the parent statement.
  const result = await writeQuery(`DELETE FROM policy_statements s WHERE s.id=$1 AND s.created_by=$2
    AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.statement_id=s.id AND q.created_by IS DISTINCT FROM $2)
    AND NOT EXISTS (SELECT 1 FROM votes v WHERE v.statement_id=s.id AND v.user_id IS DISTINCT FROM $2)
    AND NOT EXISTS (SELECT 1 FROM reconsiderations r WHERE r.statement_id=s.id AND r.requested_by IS DISTINCT FROM $2)
    RETURNING s.id::text`, [id, user.id]);
  if (!result.rowCount) throw new WriteError(409, 'Statement is unavailable or still has another guest’s contributions.');
  return {record: result.rows[0], returnTo: '/explore', message: 'Policy statement deleted.'};
}

async function createQuote(form, user) {
  const statementId = idField(form, 'statement_id');
  const [content, author, url, passage] = quoteInput(form);
  const result = await writeQuery(`INSERT INTO quotes(statement_id,content,author_name,source_url,source_text,created_by)
    SELECT $1,$2,$3,$4,$5,$6 WHERE EXISTS (SELECT 1 FROM policy_statements WHERE id=$1)
    RETURNING id::text,statement_id::text,content,author_name,source_url,source_text,created_by::text`,
  [statementId, content, author, url, passage, user.id]);
  if (!result.rowCount) throw new WriteError(404, 'Policy statement not found.');
  return {record: result.rows[0], message: 'Source quotation added.'};
}

async function updateQuote(form, user) {
  const id = idField(form, 'id');
  const [content, author, url, passage] = quoteInput(form);
  const result = await writeQuery(`UPDATE quotes SET content=$2,author_name=$3,source_url=$4,source_text=$5,updated_at=now()
    WHERE id=$1 AND created_by=$6 RETURNING id::text,statement_id::text,content,author_name,source_url,source_text,created_by::text`,
  [id, content, author, url, passage, user.id]);
  return ownedResult(result, undefined, 'Source quotation updated.');
}

async function deleteQuote(form, user) {
  const result = await writeQuery('DELETE FROM quotes WHERE id=$1 AND created_by=$2 RETURNING id::text', [idField(form, 'id'), user.id]);
  return ownedResult(result, undefined, 'Source quotation deleted.');
}

async function setVote(form, user) {
  const statementId = idField(form, 'statement_id');
  const position = choiceField(form, 'position', ['for', 'against', 'abstain']);
  const result = await writeQuery(`INSERT INTO votes(statement_id,user_id,position)
    SELECT $1,$2,$3 WHERE EXISTS (SELECT 1 FROM policy_statements WHERE id=$1)
    ON CONFLICT (statement_id,user_id) DO UPDATE SET position=EXCLUDED.position,updated_at=now()
    RETURNING id::text,statement_id::text,user_id::text,position`, [statementId, user.id, position]);
  if (!result.rowCount) throw new WriteError(404, 'Policy statement not found.');
  return {record: result.rows[0], message: `Vote saved as ${position}.`};
}

async function createReconsideration(form, user) {
  const statementId = idField(form, 'statement_id');
  const rationale = textField(form, 'rationale', {min: 3, max: 10000, label: 'Rationale'});
  const result = await writeQuery(`INSERT INTO reconsiderations(statement_id,requested_by,rationale)
    SELECT $1,$2,$3 WHERE EXISTS (SELECT 1 FROM policy_statements WHERE id=$1)
    RETURNING id::text,statement_id::text,requested_by::text,rationale,status`, [statementId, user.id, rationale]);
  if (!result.rowCount) throw new WriteError(404, 'Policy statement not found.');
  return {record: result.rows[0], returnTo: '/reconsider', message: 'Reconsideration opened.'};
}

async function closeReconsideration(form, user) {
  const result = await writeQuery(`UPDATE reconsiderations SET status='closed',updated_at=now()
    WHERE id=$1 AND requested_by=$2 AND status='open' RETURNING id::text,status`, [idField(form, 'id'), user.id]);
  return ownedResult(result, '/reconsider', 'Reconsideration closed.');
}

async function createIntelligence(form, user) {
  const [title, summary, content] = intelligenceInput(form);
  const slug = slugFor(title);
  const result = await writeQuery(`INSERT INTO intelligence_posts(slug,title,summary,content,status,author_id,published_at)
    VALUES ($1,$2,$3,$4,'published',$5,now())
    RETURNING id::text,slug,title,summary,content,status,author_id::text,published_at::text`, [slug, title, summary, content, user.id]);
  return {record: result.rows[0], returnTo: '/intelligence', message: 'Intelligence post published.'};
}

async function updateIntelligence(form, user) {
  const [title, summary, content] = intelligenceInput(form);
  const result = await writeQuery(`UPDATE intelligence_posts SET title=$2,summary=$3,content=$4,updated_at=now()
    WHERE id=$1 AND author_id=$5
    RETURNING id::text,slug,title,summary,content,status,author_id::text,published_at::text`,
  [idField(form, 'id'), title, summary, content, user.id]);
  return ownedResult(result, '/intelligence', 'Intelligence post updated.');
}

async function deleteIntelligence(form, user) {
  const result = await writeQuery('DELETE FROM intelligence_posts WHERE id=$1 AND author_id=$2 RETURNING id::text', [idField(form, 'id'), user.id]);
  return ownedResult(result, '/intelligence', 'Intelligence post deleted.');
}

const mutations = {
  'statement:create': createStatement,
  'statement:update': updateStatement,
  'statement:delete': deleteStatement,
  'quote:create': createQuote,
  'quote:update': updateQuote,
  'quote:delete': deleteQuote,
  'vote:set': setVote,
  'reconsideration:create': createReconsideration,
  'reconsideration:close': closeReconsideration,
  'intelligence:create': createIntelligence,
  'intelligence:update': updateIntelligence,
  'intelligence:delete': deleteIntelligence
};

export async function mutate(form, user) {
  const resource = choiceField(form, 'resource', ['statement', 'quote', 'vote', 'reconsideration', 'intelligence']);
  const operation = choiceField(form, 'operation', ['create', 'update', 'delete', 'set', 'close']);
  const key = `${resource}:${operation}`;
  const mutation = mutations[key];
  if (!mutation) throw new WriteError(400, 'Unsupported mutation.');
  return mutation(form, user);
}
