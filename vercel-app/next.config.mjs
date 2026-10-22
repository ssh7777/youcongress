const appUrl = process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, '')}`
    : undefined);

export default {
  poweredByHeader: false,
  env: {
    // NEXT_PUBLIC_APP_URL falls back to the Vercel production URL so previews and
    // local builds still expose a canonical origin.
    ...(appUrl ? {NEXT_PUBLIC_APP_URL: appUrl} : {}),
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'APX'
  },
  async headers() {
    return [{source: '/:path*', headers: [
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
      {key: 'X-Frame-Options', value: 'DENY'}
    ]}];
  }
};
