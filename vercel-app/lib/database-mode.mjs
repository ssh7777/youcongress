import {databaseUrl} from './database-url.mjs';

export const EMBEDDED_DATABASE = 'embedded';
export const EXTERNAL_DATABASE = 'external';

export function databaseMode(env = process.env) {
  if (env.APX_DATABASE_MODE === EMBEDDED_DATABASE) return EMBEDDED_DATABASE;
  if (env.APX_DATABASE_MODE === EXTERNAL_DATABASE) {
    if (!databaseUrl(env)) {
      throw new Error('DATABASE_URL is required when APX_DATABASE_MODE=external; PRISMA_DATABASE_URL and POSTGRES_URL are also accepted.');
    }
    return EXTERNAL_DATABASE;
  }
  if (env.APX_DATABASE_MODE) throw new Error('APX_DATABASE_MODE must be embedded or external.');
  if (databaseUrl(env)) return EXTERNAL_DATABASE;
  throw new Error('Set DATABASE_URL, PRISMA_DATABASE_URL, or POSTGRES_URL for external PostgreSQL or APX_DATABASE_MODE=embedded for the read-only embedded database.');
}
