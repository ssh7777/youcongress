import { query } from '../../../lib/db.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await query('SELECT s.id, o.id, os.statement_id, a.id FROM statements s LEFT JOIN opinions_statements os ON os.statement_id=s.id LEFT JOIN opinions o ON o.id=os.opinion_id LEFT JOIN authors a ON a.id=o.author_id LIMIT 1');
    return Response.json({status: 'ok', mode: 'read-only-migration-preview'}, {headers: {'Cache-Control': 'no-store'}});
  } catch {
    return Response.json({status: 'unavailable'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
  }
}
