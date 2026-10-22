import {databaseUrl} from './database-url.mjs';

export function postgresConfig(env = process.env) {
  const connectionString = databaseUrl(env);
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for PostgreSQL access; PRISMA_DATABASE_URL and POSTGRES_URL are also accepted.');
  }

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
