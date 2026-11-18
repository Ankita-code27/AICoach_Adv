import assert from 'node:assert/strict';
import test from 'node:test';
import { average, standardDeviation, consistencyLabel, computeTrend, scoreOverTime, computeAnalytics } from '../src/utils/analytics.js';

function makeInterview(overrides) {
  return {
    id: 'id-1',
    role: 'Software Engineer',
    difficulty: 'medium',
    interviewType: 'mixed',
    mode: 'fixed',
    resumeUsed: false,
    skills: [],
    questionCount: 2,
    overallScore: 7,
    responses: [
      { questionId: 1, question: 'Q1', type: 'technical', answer: 'A1', evaluation: { score: 7 } },
      { questionId: 2, question: 'Q2', type: 'behavioral', answer: 'A2', evaluation: { score: 7 } },
    ],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

test('average returns null for an empty list and rounds to one decimal', () => {
  assert.equal(average([]), null);
  assert.equal(average([7, 8, 9]), 8);
  assert.equal(average([7, 8]), 7.5);
});

test('standardDeviation is null for fewer than two scores and 0 for identical scores', () => {
  assert.equal(standardDeviation([]), null);
  assert.equal(standardDeviation([7]), null);
  assert.equal(standardDeviation([7, 7, 7]), 0);
  assert.ok(standardDeviation([2, 8]) > 0);
});

test('consistencyLabel buckets standard deviation into readable tiers', () => {
  assert.equal(consistencyLabel(null), null);
  assert.equal(consistencyLabel(0.5), 'Very consistent');
  assert.equal(consistencyLabel(1.8), 'Consistent');
  assert.equal(consistencyLabel(3), 'Variable');
});

test('computeTrend needs at least two data points and compares recent vs previous windows', () => {
  assert.equal(computeTrend([makeInterview({ overallScore: 7 })]), null);

  // Most-recent-first, as fetchUserInterviews returns it: scores improving over time.
  const interviews = [8, 8, 5, 5].map((score, index) => makeInterview({ id: `id-${index}`, overallScore: score }));
  const trend = computeTrend(interviews);

  assert.equal(trend.recentAverage, 8);
  assert.equal(trend.previousAverage, 5);
  assert.equal(trend.delta, 3);
  assert.equal(trend.direction, 'up');
});

test('computeTrend reports a flat direction for a tiny, insignificant delta', () => {
  const interviews = [7, 7.03].map((score, index) => makeInterview({ id: `id-${index}`, overallScore: score }));
  const trend = computeTrend(interviews);
  assert.equal(trend.direction, 'flat');
});

test('scoreOverTime sorts ascending by date regardless of input order', () => {
  const interviews = [
    makeInterview({ id: 'later', overallScore: 9, createdAt: new Date('2026-02-01T00:00:00Z') }),
    makeInterview({ id: 'earlier', overallScore: 4, createdAt: new Date('2026-01-01T00:00:00Z') }),
  ];

  const series = scoreOverTime(interviews);
  assert.equal(series.length, 2);
  assert.equal(series[0].id, 'earlier');
  assert.equal(series[1].id, 'later');
});

test('scoreOverTime skips interviews with no numeric overallScore', () => {
  const interviews = [makeInterview({ overallScore: null }), makeInterview({ overallScore: 6 })];
  assert.equal(scoreOverTime(interviews).length, 1);
});

test('computeAnalytics returns sensible zero-state for an empty history', () => {
  const analytics = computeAnalytics([]);
  assert.equal(analytics.totalInterviews, 0);
  assert.equal(analytics.totalQuestions, 0);
  assert.equal(analytics.overallAverage, null);
  assert.equal(analytics.trend, null);
  assert.deepEqual(analytics.scoreOverTime, []);
  assert.deepEqual(analytics.byRole, []);
  assert.deepEqual(analytics.bySkill, []);
});

test('computeAnalytics breaks scores down by skill, where one interview can count toward several skills', () => {
  const interviews = [
    makeInterview({ id: 'a', overallScore: 9, skills: ['React', 'PostgreSQL'] }),
    makeInterview({ id: 'b', overallScore: 5, skills: ['React'] }),
    makeInterview({ id: 'c', overallScore: 7, skills: [] }), // no skills tagged, contributes nowhere
  ];

  const analytics = computeAnalytics(interviews);
  const skillByKey = Object.fromEntries(analytics.bySkill.map((entry) => [entry.key, entry]));

  assert.equal(skillByKey.React.count, 2);
  assert.equal(skillByKey.React.average, 7); // (9 + 5) / 2
  assert.equal(skillByKey.PostgreSQL.count, 1);
  assert.equal(skillByKey.PostgreSQL.average, 9);
});

test('computeAnalytics tolerates interviews with no skills field at all (pre-Phase-3 data)', () => {
  const interviews = [makeInterview({ id: 'a', skills: undefined, overallScore: 6 })];
  assert.doesNotThrow(() => computeAnalytics(interviews));
  assert.deepEqual(computeAnalytics(interviews).bySkill, []);
});

test('computeAnalytics breaks scores down by question type across multiple interviews', () => {
  const interviews = [
    makeInterview({
      id: 'a',
      overallScore: 8,
      responses: [
        { questionId: 1, type: 'technical', evaluation: { score: 9 } },
        { questionId: 2, type: 'behavioral', evaluation: { score: 7 } },
      ],
    }),
    makeInterview({
      id: 'b',
      overallScore: 5,
      responses: [
        { questionId: 1, type: 'technical', evaluation: { score: 5 } },
      ],
    }),
  ];

  const analytics = computeAnalytics(interviews);
  assert.equal(analytics.byQuestionType.technical.average, 7); // (9 + 5) / 2
  assert.equal(analytics.byQuestionType.technical.count, 2);
  assert.equal(analytics.byQuestionType.behavioral.average, 7);
  assert.equal(analytics.byQuestionType.behavioral.count, 1);
});

test('computeAnalytics breaks scores down by difficulty (an interview-level field applied to every response)', () => {
  const interviews = [
    makeInterview({ id: 'a', difficulty: 'hard', responses: [{ type: 'technical', evaluation: { score: 6 } }] }),
    makeInterview({ id: 'b', difficulty: 'easy', responses: [{ type: 'technical', evaluation: { score: 10 } }] }),
  ];

  const analytics = computeAnalytics(interviews);
  assert.equal(analytics.byDifficulty.hard.average, 6);
  assert.equal(analytics.byDifficulty.easy.average, 10);
});

test('computeAnalytics groups by role, sorted by how often each role was practiced', () => {
  const interviews = [
    makeInterview({ id: 'a', role: 'Backend Developer', overallScore: 6 }),
    makeInterview({ id: 'b', role: 'Backend Developer', overallScore: 8 }),
    makeInterview({ id: 'c', role: 'Product Manager', overallScore: 9 }),
  ];

  const analytics = computeAnalytics(interviews);
  assert.equal(analytics.byRole[0].key, 'Backend Developer');
  assert.equal(analytics.byRole[0].count, 2);
  assert.equal(analytics.byRole[0].average, 7);
  assert.equal(analytics.byRole[1].key, 'Product Manager');
});

test('computeAnalytics separates adaptive vs fixed and resume-tailored vs standard sessions', () => {
  const interviews = [
    makeInterview({ id: 'a', mode: 'adaptive', resumeUsed: true, overallScore: 9 }),
    makeInterview({ id: 'b', mode: 'fixed', resumeUsed: false, overallScore: 5 }),
  ];

  const analytics = computeAnalytics(interviews);
  const modeByKey = Object.fromEntries(analytics.byMode.map((entry) => [entry.key, entry]));
  const resumeByKey = Object.fromEntries(analytics.byResumeUsage.map((entry) => [entry.key, entry]));

  assert.equal(modeByKey.Adaptive.average, 9);
  assert.equal(modeByKey.Fixed.average, 5);
  assert.equal(resumeByKey['Resume-tailored'].average, 9);
  assert.equal(resumeByKey.Standard.average, 5);
});

test('computeAnalytics tolerates interviews with missing or malformed responses', () => {
  const interviews = [
    makeInterview({ id: 'a', responses: undefined, overallScore: 6 }),
    makeInterview({ id: 'b', responses: null, overallScore: 7 }),
  ];

  assert.doesNotThrow(() => computeAnalytics(interviews));
  const analytics = computeAnalytics(interviews);
  assert.equal(analytics.overallAverage, 6.5);
  assert.deepEqual(analytics.byQuestionType, {});
});
