import { handleMutation } from '../../../lib/http.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  return handleMutation(request);
}
