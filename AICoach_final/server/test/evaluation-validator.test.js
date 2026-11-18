import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCompletedInterview } from '../src/validators/evaluation.validator.js';

function buildValidBody(overrides = {}) {
  return {
    role: 'Software Engineer',
    difficulty: 'medium',
    interviewType: 'technical',
    mode: 'adaptive',
    skills: ['React', 'PostgreSQL', 'React'], // deliberate exact duplicate to test dedupe
    questions: [
      { id: 1, question: 'Explain indexing.', type: 'technical' },
      { id: 2, question: 'Describe a conflict you resolved.', type: 'behavioral' },
    ],
    answers: {
      1: 'An index speeds up lookups at the cost of write overhead.',
      2: 'I disagreed with a teammate about API design and we settled it with a quick prototype.',
    },
    evaluations: {
      1: { score: 8, strengths: ['Clear'], weaknesses: ['Could mention trade-offs'], feedback: 'Good.', suggestions: ['Mention trade-offs'], sampleAnswer: 'An index is a data structure...' },
      2: { score: 7, strengths: ['Concrete example'], weaknesses: [], feedback: 'Solid.', suggestions: [], sampleAnswer: 'In a past role...' },
    },
    ...overrides,
  };
}

test('persists skills (deduplicated) alongside the rest of a completed interview', () => {
  const result = validateCompletedInterview(buildValidBody());

  assert.deepEqual(result.skills, ['React', 'PostgreSQL']);
  assert.equal(result.mode, 'adaptive');
  assert.equal(result.overallScore, 7.5);
  assert.equal(result.responses.length, 2);
});

test('defaults skills to an empty array when omitted', () => {
  const body = buildValidBody();
  delete body.skills;

  const result = validateCompletedInterview(body);
  assert.deepEqual(result.skills, []);
});

test('defaults mode to fixed when omitted or invalid, matching pre-adaptive behavior', () => {
  const body = buildValidBody();
  delete body.mode;

  const result = validateCompletedInterview(body);
  assert.equal(result.mode, 'fixed');
});

test('carries resumeContext through when present and valid', () => {
  const body = buildValidBody({
    resumeContext: {
      summary: 'Backend engineer with 5 years of experience.',
      skills: ['Node.js', 'AWS'],
      yearsOfExperience: 5,
      roles: [{ title: 'Backend Engineer', company: 'Acme', highlights: ['Built a payments service'] }],
      projects: [],
    },
  });

  const result = validateCompletedInterview(body);
  assert.equal(result.resumeContext.summary, 'Backend engineer with 5 years of experience.');
  assert.deepEqual(result.resumeContext.skills, ['Node.js', 'AWS']);
});

test('rejects a completed interview with a bad question/answer id mismatch', () => {
  const body = buildValidBody();
  body.questions[0].id = 99; // no matching answer/evaluation entry, and not sequential

  assert.throws(() => validateCompletedInterview(body), (error) => error.code === 'INVALID_INTERVIEW_RESULT');
});

test('rejects an interview with no questions', () => {
  const body = buildValidBody({ questions: [] });
  assert.throws(() => validateCompletedInterview(body), (error) => error.code === 'INVALID_INTERVIEW_RESULT');
});

test('rejects more than 8 skills, same limit as interview setup', () => {
  const body = buildValidBody({ skills: Array.from({ length: 9 }, (_, index) => `Skill ${index}`) });
  assert.throws(() => validateCompletedInterview(body), (error) => error.code === 'INVALID_SKILLS');
});

test('accepts a completed interview with a coding response, storing code as answer plus language', () => {
  const body = buildValidBody({
    interviewType: 'coding',
    language: 'python',
    questions: [
      { id: 1, question: 'Two Sum', type: 'coding' },
    ],
    answers: {
      1: { code: 'def two_sum(nums, target):\n    pass', language: 'python' },
    },
    evaluations: {
      1: {
        score: 6,
        strengths: ['Clear structure'],
        weaknesses: ['Incomplete'],
        feedback: 'Needs a working implementation.',
        suggestions: ['Use a hash map'],
        sampleAnswer: 'def two_sum(nums, target): ...',
        correctnessNotes: 'The stub does not return anything, so it would not satisfy the examples.',
        complexityNotes: 'Cannot be determined - no implementation.',
      },
    },
  });

  const result = validateCompletedInterview(body);
  assert.equal(result.language, 'python');
  assert.equal(result.responses[0].type, 'coding');
  assert.equal(result.responses[0].language, 'python');
  assert.match(result.responses[0].answer, /two_sum/);
});

test('rejects a coding response with an unsupported language', () => {
  const body = buildValidBody({
    interviewType: 'coding',
    language: 'python',
    questions: [{ id: 1, question: 'Two Sum', type: 'coding' }],
    answers: { 1: { code: 'def two_sum(): pass', language: 'brainfuck' } },
    evaluations: { 1: { score: 5, strengths: [], weaknesses: [], feedback: 'ok', suggestions: [], sampleAnswer: 'x' } },
  });

  assert.throws(() => validateCompletedInterview(body), (error) => error.code === 'INVALID_INTERVIEW_RESULT');
});

test('rejects a coding response with empty code', () => {
  const body = buildValidBody({
    interviewType: 'coding',
    language: 'python',
    questions: [{ id: 1, question: 'Two Sum', type: 'coding' }],
    answers: { 1: { code: '  ', language: 'python' } },
    evaluations: { 1: { score: 5, strengths: [], weaknesses: [], feedback: 'ok', suggestions: [], sampleAnswer: 'x' } },
  });

  assert.throws(() => validateCompletedInterview(body), (error) => error.code === 'INVALID_INTERVIEW_RESULT');
});
