import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import healthRouter from './routes/health.routes.js';
import interviewRouter from './routes/interview.routes.js';
import resumeRouter from './routes/resume.routes.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// When deployed behind a reverse proxy or load balancer (Render, Railway, Heroku, etc.),
// req.ip otherwise reflects the proxy's address rather than the real client, which breaks
// IP-based rate limiting. Set TRUST_PROXY=1 (or a specific proxy count/CIDR) in that case.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY);
}

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
// A generous ceiling, not the primary defense: request bodies are already validated field-by-field
// (see the validators), but a full completed-interview payload (up to 20 questions, each with a
// full answer and AI evaluation) can legitimately reach several hundred KB.
app.use(express.json({ limit: '1mb' }));

// A lenient, app-wide baseline in addition to the stricter per-route limiters below -
// defense in depth against generic abuse of any endpoint, including /health.
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}));

app.use('/api/health', healthRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/resume', resumeRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
