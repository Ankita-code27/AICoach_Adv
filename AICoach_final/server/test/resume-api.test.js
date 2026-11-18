import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import express from 'express';
import multer from 'multer';
import app from '../src/app.js';
import { parseResume } from '../src/controllers/resume.controller.js';
import { createRequireAuth } from '../src/middleware/auth.middleware.js';
import { errorHandler } from '../src/middleware/error.middleware.js';
import AppError from '../src/utils/AppError.js';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const sampleResumePath = resolve(testDirectory, 'fixtures/sample-resume.pdf');

async function requestResumeUpload(application, { fileBuffer, fileName = 'resume.pdf', contentType = 'application/pdf', token } = {}) {
  const server = application.listen(0, '127.0.0.1');

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();

    const headers = {};
    if (token) headers.authorization = `Bearer ${token}`;

    let body;
    if (fileBuffer) {
      const formData = new FormData();
      formData.append('resume', new Blob([fileBuffer], { type: contentType }), fileName);
      body = formData;
    }

    const response = await fetch(`http://127.0.0.1:${port}/api/resume/parse`, {
      method: 'POST',
      headers,
      body,
    });

    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose())));
  }
}

function createAuthenticatedTestApp() {
  const testApp = express();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

  testApp.post(
    '/api/resume/parse',
    createRequireAuth(async (token) => {
      if (token !== 'valid-test-token') throw new Error('Invalid token');
      return { uid: 'test-user' };
    }),
    (request, response, next) => {
      upload.single('resume')(request, response, (error) => {
        if (error instanceof multer.MulterError) {
          return next(new AppError('Unable to process the uploaded file.', {
            statusCode: 400,
            code: 'INVALID_RESUME_UPLOAD',
            expose: true,
          }));
        }
        next(error);
      });
    },
    parseResume,
  );
  testApp.use(errorHandler);
  return testApp;
}

test('rejects an unauthenticated resume upload', async () => {
  const fileBuffer = await readFile(sampleResumePath);
  const response = await requestResumeUpload(app, { fileBuffer });

  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'AUTH_REQUIRED');
});

test('rejects a non-PDF file before ever touching the AI service', async () => {
  const response = await requestResumeUpload(createAuthenticatedTestApp(), {
    fileBuffer: Buffer.from('just some plain text, not a pdf'),
    fileName: 'resume.txt',
    contentType: 'text/plain',
    token: 'valid-test-token',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'INVALID_RESUME_FILE_TYPE');
});

test('rejects an oversized upload before ever touching the AI service', async () => {
  const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024, 1); // 6MB > 5MB limit

  const response = await requestResumeUpload(createAuthenticatedTestApp(), {
    fileBuffer: oversizedBuffer,
    fileName: 'resume.pdf',
    contentType: 'application/pdf',
    token: 'valid-test-token',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'INVALID_RESUME_UPLOAD');
});

test('rejects a request with no file attached', async () => {
  const response = await requestResumeUpload(createAuthenticatedTestApp(), {
    token: 'valid-test-token',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'MISSING_RESUME_FILE');
});

test('extracts text from a real PDF and reaches the AI step (fails safely with no Gemini key configured)', async () => {
  // This proves the full pipeline - file validation, PDF text extraction, and handing off
  // to the AI structuring step - works end to end, without needing a live Gemini API key
  // in CI. If extraction were broken, this would fail earlier with a parsing error instead.
  const previousApiKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const fileBuffer = await readFile(sampleResumePath);
    const response = await requestResumeUpload(createAuthenticatedTestApp(), {
      fileBuffer,
      token: 'valid-test-token',
    });

    assert.equal(response.status, 503);
    assert.equal(response.body.code, 'AI_NOT_CONFIGURED');
  } finally {
    if (previousApiKey) {
      process.env.GROQ_API_KEY = previousApiKey;
    }
  }
});
