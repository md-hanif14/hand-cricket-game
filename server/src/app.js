import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.js';
import { matchesRouter } from './routes/matches.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '32kb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'hand-cricket-api' }));
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRouter);
app.use('/api/matches', matchesRouter);

app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));

app.use((error, _req, res, _next) => {
  console.error('API error:', error);
  if (res.headersSent) return;
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});
