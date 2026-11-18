import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { parseResume } from '../controllers/resume.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { MAX_FILE_SIZE_BYTES } from '../validators/resume.validator.js';
import AppError from '../utils/AppError.js';

const router = Router();

// Memory storage only - the file is parsed in-process and never touches disk, consistent
// with the "never persist the raw resume" policy in resume.controller.js.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
});

// Resume parsing does a PDF-extraction pass plus a full Gemini call - meaningfully more
// expensive per request than a typical JSON endpoint, so it gets its own, tighter limiter.
const resumeUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    message: 'Too many resume uploads. Please try again later.',
    code: 'RATE_LIMITED',
  },
});

function handleUploadError(error, request, response, next) {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Resume file must be 5MB or smaller.'
      : 'Unable to process the uploaded file.';
    return next(new AppError(message, { statusCode: 400, code: 'INVALID_RESUME_UPLOAD', expose: true }));
  }
  next(error);
}

router.post(
  '/parse',
  resumeUploadLimiter,
  requireAuth,
  (request, response, next) => {
    upload.single('resume')(request, response, (error) => {
      if (error) return handleUploadError(error, request, response, next);
      next();
    });
  },
  parseResume,
);

export default router;
