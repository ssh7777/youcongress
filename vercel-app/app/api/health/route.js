import { query } from '../../../lib/db.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await query(`SELECT u.id, s.id, v.id, q.id, p.id
      FROM users u
      FULL JOIN policy_statements s ON true
      FULL JOIN votes v ON true
      FULL JOIN quotes q ON true
      FULL JOIN intelligence_posts p ON true
      LIMIT 1`);
    return Response.json({status: 'ok', app: process.env.NEXT_PUBLIC_APP_NAME || 'APX', mode: 'read-only', schema: ['users', 'policy_statements', 'votes', 'quotes', 'intelligence_posts']}, {headers: {'Cache-Control': 'no-store'}});
  } catch {
    return Response.json({status: 'unavailable'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
  }
}
