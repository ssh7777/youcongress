import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { query, writeTransaction } from './db.mjs';
import { databaseMode, EMBEDDED_DATABASE } from './database-mode.mjs';

export const GUEST_COOKIE = 'apx_guest';
const MAX_AGE = 60 * 60 * 24 * 365;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function currentUser() {
  if (databaseMode() === EMBEDDED_DATABASE) return null;
  const jar = await cookies();
  const token = jar.get(GUEST_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const {rows} = await query(`
    SELECT u.id::text, u.display_name
    FROM guest_sessions gs
    JOIN users u ON u.id = gs.user_id
    WHERE gs.token_hash = $1 AND gs.expires_at > now()
    LIMIT 1`, [hashToken(token)]);
  return rows[0] || null;
}

export async function requireUser() {
  const existing = await currentUser();
  if (existing) return {user: existing};

  const token = randomBytes(32).toString('base64url');
  const displayName = `Guest ${randomBytes(3).toString('hex')}`;
  const user = await writeTransaction(async write => {
    const {rows} = await write('INSERT INTO users(display_name) VALUES ($1) RETURNING id::text, display_name', [displayName]);
    await write('INSERT INTO guest_sessions(user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval \'1 year\')', [rows[0].id, hashToken(token)]);
    return rows[0];
  });

  return {
    user,
    cookie: {
      name: GUEST_COOKIE,
      value: token,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: MAX_AGE
      }
    }
  };
}
