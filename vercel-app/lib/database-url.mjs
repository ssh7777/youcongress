const DATABASE_URL_KEYS = ['DATABASE_URL', 'PRISMA_DATABASE_URL', 'POSTGRES_URL'];

// Vercel's Postgres integrations do not all inject the same variable. Prefer the
// conventional DATABASE_URL, but tolerate an empty placeholder left by an older
// manual setup when an integration has supplied a usable connection string.
export function databaseUrl(env = process.env) {
  for (const key of DATABASE_URL_KEYS) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return '';
}
