import { Router } from 'express';
import { completeInterview, evaluateInterview, getNextQuestion, startInterview } from '../controllers/interview.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const startInterviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    message: 'Too many interview-generation requests. Please try again later.',
    code: 'RATE_LIMITED',
  },
});

// Previously this route reused startInterviewLimiter (10 / 15 min), which meant a single
// 10+ question interview could lock a user out of evaluating their own answers before they
// even finished. Evaluation happens once per question, so it needs a limit that scales with
// a full interview session (up to 20 questions), not with question-generation.
const evaluateInterviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    message: 'Too many answer-evaluation requests. Please try again later.',
    code: 'RATE_LIMITED',
  },
});

// Adaptive mode calls this once per question too (in place of the local "next" click in
// fixed mode), so it needs the same headroom as evaluation.
const nextQuestionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    message: 'Too many requests. Please try again later.',
    code: 'RATE_LIMITED',
  },
});

const completeInterviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    message: 'Too many requests. Please try again later.',
    code: 'RATE_LIMITED',
  },
});

router.post('/start', startInterviewLimiter, requireAuth, startInterview);
router.post('/next', nextQuestionLimiter, requireAuth, getNextQuestion);
router.post('/evaluate', evaluateInterviewLimiter, requireAuth, evaluateInterview);
router.post('/complete', completeInterviewLimiter, requireAuth, completeInterview);

export default router;
