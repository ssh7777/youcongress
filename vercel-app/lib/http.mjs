import { NextResponse } from 'next/server';
import { requireUser } from './session.mjs';
import { mutate } from './writes.mjs';
import { DatabaseUnavailable } from './db.mjs';
import { WriteError } from './validation.mjs';

function safeReturnTo(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !/[\r\n]/.test(value)
    ? value.slice(0, 500)
    : '/';
}

function wantsJson(request) {
  return request.headers.get('accept')?.includes('application/json');
}

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (origin) {
    const url = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
    const protocol = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
    return origin === `${protocol}://${host}`;
  }
  return request.headers.get('sec-fetch-site') === 'same-origin';
}

function responseFor(request, returnTo, {ok, message, record, status}) {
  if (wantsJson(request)) return NextResponse.json(ok ? {ok, message, record} : {ok, error: message}, {status});
  const url = new URL(safeReturnTo(returnTo), request.url);
  url.searchParams.set(ok ? 'success' : 'error', message);
  return NextResponse.redirect(url, 303);
}

export async function handleMutation(request) {
  if (!sameOrigin(request)) {
    return responseFor(request, '/', {ok: false, message: 'Cross-origin writes are not allowed.', status: 403});
  }

  let form, returnTo = '/';
  try {
    form = await request.formData();
    returnTo = safeReturnTo(form.get('returnTo'));
    const session = await requireUser();
    const result = await mutate(form, session.user);
    const response = responseFor(request, result.returnTo || returnTo, {
      ok: true,
      message: result.message || 'Changes saved.',
      record: result.record,
      status: 200
    });
    if (session.cookie) response.cookies.set(session.cookie.name, session.cookie.value, session.cookie.options);
    return response;
  } catch (error) {
    const known = error instanceof WriteError || error instanceof DatabaseUnavailable;
    const status = error instanceof WriteError ? error.status : error instanceof DatabaseUnavailable ? 503 : 500;
    if (!known) console.error('APX mutation failed unexpectedly.');
    return responseFor(request, returnTo, {
      ok: false,
      message: known ? error.message : 'The change could not be saved.',
      status
    });
  }
}
