/**
 * Centralised, typed configuration loaded from environment variables.
 * Never hardcode secrets — everything flows through .env.
 */
export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.API_PORT ?? '4000', 10),
  globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  database: {
    url: process.env.DATABASE_URL,
    replicaUrl: process.env.DATABASE_REPLICA_URL ?? process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev_access',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  security: {
    aesKey: process.env.AES_256_KEY ?? '',
    bcryptRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
    totpIssuer: process.env.TOTP_ISSUER ?? 'RMS-Platform',
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? '',
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID ?? '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? '',
      callbackUrl: process.env.FACEBOOK_CALLBACK_URL ?? '',
    },
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    fromNumber: process.env.TWILIO_FROM_NUMBER ?? '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM ?? '',
  },
  rateLimit: {
    publicPerMin: parseInt(process.env.RATE_LIMIT_PUBLIC_PER_MIN ?? '100', 10),
    authPerMin: parseInt(process.env.RATE_LIMIT_AUTH_PER_MIN ?? '500', 10),
  },
});
