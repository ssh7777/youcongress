import { records } from '../../../../lib/db.mjs';
import { pageNumber, sourceRecordsCsv } from '../../../../lib/records.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request, {params}) {
  try {
    const {slug} = await params;
    const statement = await records.statement(slug);
    if (!statement) return Response.json({error: 'Statement not found'}, {status: 404});
    const result = await records.quotes(statement.id, pageNumber(new URL(request.url).searchParams.get('page')));
    return new Response(sourceRecordsCsv(statement, result.items), {headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="source-records.csv"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }});
  } catch {
    return Response.json({error: 'Records unavailable'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
  }
}
