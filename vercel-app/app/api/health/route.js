import { query } from '../../../lib/db.mjs';
import { databaseMode } from '../../../lib/database-mode.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mode = databaseMode();
    const {rows} = await query(`
      SELECT
        to_regclass('public.users') IS NOT NULL AS users,
        to_regclass('public.policy_statements') IS NOT NULL AS policy_statements,
        to_regclass('public.votes') IS NOT NULL AS votes,
        to_regclass('public.quotes') IS NOT NULL AS quotes,
        to_regclass('public.intelligence_posts') IS NOT NULL AS intelligence_posts,
        to_regclass('public.reconsiderations') IS NOT NULL AS reconsiderations,
        to_regclass('public.guest_sessions') IS NOT NULL AS guest_sessions,
        EXISTS (SELECT 1 FROM apx_schema_migrations WHERE version = '002_persistent_writes') AS migrated
    `);
    const healthy = Object.values(rows[0]).every(Boolean);
    if (!healthy) throw new Error('APX schema is incomplete.');
    return Response.json({status: 'ok', database: 'postgresql', mode, schema: '002_persistent_writes'}, {headers: {'Cache-Control': 'no-store'}});
  } catch {
    return Response.json({status: 'unavailable', database: 'postgresql'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
  }
}
