export function postgresConfig(env = process.env) {
  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error('DATABASE_URL is required for PostgreSQL access.');

  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
  }

  // Explicit TLS options must not be overwritten by pg's connection-string parser.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return {
    connectionString: url.href,
    ssl: env.DATABASE_SSL === 'false' ? false : {rejectUnauthorized: true}
  };
}
