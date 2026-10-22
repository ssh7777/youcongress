import pg from 'pg';

export function databaseUrl(env = process.env) {
  const value = env.DATABASE_URL?.trim();
  return value ? value : null;
}

export function connectionSettings(urlString, env = process.env) {
  const url = new URL(urlString);
  // pg connection-string SSL parameters can replace the explicit TLS settings.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return {
    connectionString: url.href,
    ssl: env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: true },
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000,
    allowExitOnIdle: true
  };
}

export function makeClient(urlString, env = process.env) {
  return new pg.Client(connectionSettings(urlString, env));
}
