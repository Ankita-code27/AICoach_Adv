import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import app from '../src/app.js';
import { evaluateInterview, getNextQuestion, startInterview } from '../src/controllers/interview.controller.js';
import { createRequireAuth } from '../src/middleware/auth.middleware.js';
import { errorHandler } from '../src/middleware/error.middleware.js';

async function requestStartInterview(application, body, token) {
  return requestInterviewEndpoint(application, '/api/interview/start', body, token);
}

async function requestInterviewEndpoint(application, path, body, token) {
  const server = application.listen(0, '127.0.0.1');

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token && { authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });

    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

function createAuthenticatedTestApp() {
  const testApp = express();
  testApp.use(express.json());
  testApp.post('/api/interview/start', createRequireAuth(async (token) => {
    if (token !== 'valid-test-token') throw new Error('Invalid token');
    return { uid: 'test-user' };
  }), startInterview);
  testApp.post('/api/interview/evaluate', createRequireAuth(async (token) => {
    if (token !== 'valid-test-token') throw new Error('Invalid token');
    return { uid: 'test-user' };
  }), evaluateInterview);
  testApp.post('/api/interview/next', createRequireAuth(async (token) => {
    if (token !== 'valid-test-token') throw new Error('Invalid token');
    return { uid: 'test-user' };
  }), getNextQuestion);
  testApp.use(errorHandler);
  return testApp;
}

test('rejects a request that has no Firebase bearer token', async () => {
  const response = await requestStartInterview(app, {
    role: '',
    difficulty: 'medium',
    numberOfQuestions: 5,
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'AUTH_REQUIRED');
});

test('rejects unauthenticated answer evaluation requests', async () => {
  const response = await requestInterviewEndpoint(app, '/api/interview/evaluate', {
    question: 'What is a primary key?',
    answer: 'It uniquely identifies a record.',
    role: 'Software Engineer',
    difficulty: 'medium',
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'AUTH_REQUIRED');
});

test('rejects an empty answer before calling Gemini', async () => {
  const response = await requestInterviewEndpoint(createAuthenticatedTestApp(), '/api/interview/evaluate', {
    question: 'What is a primary key?',
    answer: '   ',
    role: 'Software Engineer',
    difficulty: 'medium',
  }, 'valid-test-token');

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'INVALID_ANSWER');
});

test('rejects unauthenticated next-question requests', async () => {
  const response = await requestInterviewEndpoint(app, '/api/interview/next', {
    role: 'Software Engineer',
    difficulty: 'medium',
    targetQuestionCount: 5,
    history: [],
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'AUTH_REQUIRED');
});

test('rejects a next-question request with malformed history before calling Gemini', async () => {
  const response = await requestInterviewEndpoint(createAuthenticatedTestApp(), '/api/interview/next', {
    role: 'Software Engineer',
    difficulty: 'medium',
    targetQuestionCount: 5,
    history: [{ question: 'Q1', type: 'technical', answer: 'A1', score: 99 }],
  }, 'valid-test-token');

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'INVALID_HISTORY');
});

test('short-circuits to done without calling Gemini once the adaptive hard cap is reached', async () => {
  // targetQuestionCount 5 -> hardCap 10 (see getAdaptiveBounds). Sending 10 valid history
  // entries should return { done: true } even with no Gemini key configured, proving the
  // server never calls the AI once the hard cap is hit.
  const previousApiKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const history = Array.from({ length: 10 }, (_, index) => ({
      question: `Question ${index + 1}`,
      type: 'technical',
      answer: 'A reasonably detailed answer.',
      score: 7,
    }));

    const response = await requestInterviewEndpoint(createAuthenticatedTestApp(), '/api/interview/next', {
      role: 'Software Engineer',
      difficulty: 'medium',
      targetQuestionCount: 5,
      history,
    }, 'valid-test-token');

    assert.equal(response.status, 200);
    assert.equal(response.body.done, true);
  } finally {
    if (previousApiKey) {
      process.env.GROQ_API_KEY = previousApiKey;
    }
  }
});

test('defaults interview mode to fixed when not provided, preserving existing behavior', async () => {
  const previousApiKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const response = await requestStartInterview(createAuthenticatedTestApp(), {
      role: 'Software Engineer',
      difficulty: 'medium',
      numberOfQuestions: 5,
    }, 'valid-test-token');

    // No mode sent at all - should behave exactly like the pre-adaptive API (fixed mode),
    // which calls generateInterviewQuestions and fails the same way without a Gemini key.
    assert.equal(response.status, 503);
    assert.equal(response.body.code, 'AI_NOT_CONFIGURED');
  } finally {
    if (previousApiKey) {
      process.env.GROQ_API_KEY = previousApiKey;
    }
  }
});

test('rejects an invalid interview mode', async () => {
  const response = await requestStartInterview(createAuthenticatedTestApp(), {
    role: 'Software Engineer',
    difficulty: 'medium',
    numberOfQuestions: 5,
    mode: 'not-a-real-mode',
  }, 'valid-test-token');

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'INVALID_INTERVIEW_MODE');
});

test('returns a safe configuration error for an authenticated request when no Gemini key is available', async () => {
  const previousApiKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const response = await requestStartInterview(createAuthenticatedTestApp(), {
      role: 'Software Engineer',
      difficulty: 'medium',
      numberOfQuestions: 5,
    }, 'valid-test-token');

    assert.equal(response.status, 503);
    assert.equal(response.body.code, 'AI_NOT_CONFIGURED');
    assert.equal(response.body.message, 'AI service is not configured.');
  } finally {
    if (previousApiKey) {
      process.env.GROQ_API_KEY = previousApiKey;
    }
  }
});

test('rejects starting a coding interview without a language', async () => {
  const response = await requestStartInterview(createAuthenticatedTestApp(), {
    role: 'Software Engineer',
    difficulty: 'medium',
    numberOfQuestions: 5,
    interviewType: 'coding',
  }, 'valid-test-token');

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'INVALID_LANGUAGE');
});

test('rejects an unsupported programming language', async () => {
  const response = await requestStartInterview(createAuthenticatedTestApp(), {
    role: 'Software Engineer',
    difficulty: 'medium',
    numberOfQuestions: 5,
    interviewType: 'coding',
    language: 'cobol',
  }, 'valid-test-token');

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'INVALID_LANGUAGE');
});

test('reaches the AI layer (and fails safely without a key) for a valid fixed-mode coding interview request', async () => {
  const previousApiKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const response = await requestStartInterview(createAuthenticatedTestApp(), {
      role: 'Software Engineer',
      difficulty: 'medium',
      numberOfQuestions: 5,
      interviewType: 'coding',
      language: 'python',
    }, 'valid-test-token');

    // Proves the request passes validation and reaches generateCodingProblemSet, which
    // fails the same safe way as every other AI call when no key is configured.
    assert.equal(response.status, 503);
    assert.equal(response.body.code, 'AI_NOT_CONFIGURED');
  } finally {
    if (previousApiKey) process.env.GROQ_API_KEY = previousApiKey;
  }
});

test('rejects a coding evaluation request missing the problem spec', async () => {
  const response = await requestInterviewEndpoint(createAuthenticatedTestApp(), '/api/interview/evaluate', {
    question: 'Two Sum',
    role: 'Software Engineer',
    difficulty: 'medium',
    questionType: 'coding',
    code: 'def two_sum(): pass',
    language: 'python',
  }, 'valid-test-token');

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'MISSING_PROBLEM_SPEC');
});

test('rejects a coding evaluation request with empty code before calling Groq', async () => {
  const response = await requestInterviewEndpoint(createAuthenticatedTestApp(), '/api/interview/evaluate', {
    question: 'Two Sum',
    role: 'Software Engineer',
    difficulty: 'medium',
    questionType: 'coding',
    code: '   ',
    language: 'python',
    problemSpec: { title: 'Two Sum', prompt: 'Find two numbers that add to target.' },
  }, 'valid-test-token');

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'INVALID_CODE');
});

test('short-circuits a coding adaptive interview to done without calling Groq once the hard cap is reached', async () => {
  const previousApiKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const history = Array.from({ length: 10 }, (_, index) => ({
      question: `Problem ${index + 1}`,
      type: 'coding',
      code: 'def solve(): pass',
      language: 'python',
      score: 6,
    }));

    const response = await requestInterviewEndpoint(createAuthenticatedTestApp(), '/api/interview/next', {
      role: 'Software Engineer',
      difficulty: 'medium',
      interviewType: 'coding',
      targetQuestionCount: 5,
      language: 'python',
      history,
    }, 'valid-test-token');

    assert.equal(response.status, 200);
    assert.equal(response.body.done, true);
  } finally {
    if (previousApiKey) process.env.GROQ_API_KEY = previousApiKey;
  }
});
