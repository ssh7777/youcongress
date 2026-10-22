import { randomUUID } from 'node:crypto';

// Verifies real write privileges and every persistent relation, then rolls back.
export async function verifyWriteAccess(client) {
  const slug = `deployment-probe-${randomUUID()}`;
  try {
    await client.query('BEGIN');
    const user = await client.query("INSERT INTO users(display_name) VALUES ('APX deployment probe') RETURNING id");
    const userId = user.rows[0].id;
    await client.query('INSERT INTO guest_sessions(user_id,token_hash,expires_at) VALUES ($1,$2,now() + interval \'1 hour\')', [userId, randomUUID().replaceAll('-', '').padEnd(64, '0')]);
    const statement = await client.query('INSERT INTO policy_statements(slug,title,created_by) VALUES ($1,$2,$3) RETURNING id', [slug, 'Deployment write probe', userId]);
    const statementId = statement.rows[0].id;
    await client.query("INSERT INTO votes(statement_id,user_id,position) VALUES ($1,$2,'for')", [statementId, userId]);
    await client.query("INSERT INTO quotes(statement_id,content,source_url,source_text,created_by) VALUES ($1,'Probe quote','https://example.com/probe','Probe passage',$2)", [statementId, userId]);
    await client.query('INSERT INTO reconsiderations(statement_id,requested_by,rationale) VALUES ($1,$2,$3)', [statementId, userId, 'Probe reconsideration']);
    await client.query("INSERT INTO intelligence_posts(slug,title,content,status,author_id,published_at) VALUES ($1,'Probe intelligence','Probe analysis','published',$2,now())", [slug, userId]);
    const updated = await client.query("UPDATE policy_statements SET title='Deployment write probe verified',updated_at=now() WHERE id=$1 AND created_by=$2", [statementId, userId]);
    if (updated.rowCount !== 1) throw new Error('Write probe update did not affect one row.');
    const check = await client.query(`SELECT
      (SELECT count(*)::int FROM votes WHERE statement_id=$1) AS votes,
      (SELECT count(*)::int FROM quotes WHERE statement_id=$1) AS quotes,
      (SELECT count(*)::int FROM reconsiderations WHERE statement_id=$1) AS reconsiderations,
      (SELECT count(*)::int FROM intelligence_posts WHERE slug=$2) AS intelligence,
      (SELECT count(*)::int FROM guest_sessions WHERE user_id=$3) AS sessions`, [statementId, slug, userId]);
    if (Object.values(check.rows[0]).some(value => value !== 1)) throw new Error('Write probe relations are incomplete.');
    await client.query('ROLLBACK');
    console.log('APX external PostgreSQL write probe passed; probe data rolled back.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw new Error(`APX external PostgreSQL write probe failed: ${error.message}`);
  }
}
