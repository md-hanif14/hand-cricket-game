import 'dotenv/config';

const required = ['JWT_SECRET', 'MONGODB_URI'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters. Generate a long random value before starting the app.');
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  cookieName: process.env.COOKIE_NAME ?? 'hc_token',
  roundDurationMs: Math.max(1000, Number(process.env.ROUND_DURATION_MS ?? 3000)),
  revealDurationMs: Math.max(500, Number(process.env.REVEAL_DURATION_MS ?? 1900)),
  disconnectGraceMs: Math.max(5000, Number(process.env.DISCONNECT_GRACE_MS ?? 30000)),
};
