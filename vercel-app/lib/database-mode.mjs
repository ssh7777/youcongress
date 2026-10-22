export const EMBEDDED_DATABASE = 'embedded';
export const EXTERNAL_DATABASE = 'external';

export function databaseMode(env = process.env) {
  if (env.APX_DATABASE_MODE === EMBEDDED_DATABASE) return EMBEDDED_DATABASE;
  if (env.APX_DATABASE_MODE === EXTERNAL_DATABASE) {
    if (!env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required when APX_DATABASE_MODE=external.');
    return EXTERNAL_DATABASE;
  }
  if (env.APX_DATABASE_MODE) throw new Error('APX_DATABASE_MODE must be embedded or external.');
  if (env.DATABASE_URL?.trim()) return EXTERNAL_DATABASE;
  throw new Error('Set DATABASE_URL for external PostgreSQL or APX_DATABASE_MODE=embedded for the read-only embedded database.');
}
