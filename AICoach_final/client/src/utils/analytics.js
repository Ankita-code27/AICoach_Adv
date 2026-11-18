// All functions here take the already-fetched interview list from fetchUserInterviews()
// (see services/interviews.js) and derive insights from data that's already being pulled
// down for the Dashboard/History pages. This intentionally avoids a new backend endpoint,
// a new Firestore composite index, or an Admin SDK query - the existing single-field
// (userId ==) query already gives us everything these functions need, and aggregating
// client-side keeps this consistent with how Dashboard/History already work.
//
// Each interview: { id, role, difficulty, interviewType, mode, resumeUsed, questionCount,
// overallScore, responses: [{ questionId, question, type, answer, evaluation }], createdAt }

function average(numbers) {
  if (!numbers.length) return null;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(1));
}

function standardDeviation(numbers) {
  if (numbers.length < 2) return null;
  const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  const variance = numbers.reduce((sum, value) => sum + (value - mean) ** 2, 0) / numbers.length;
  return Number(Math.sqrt(variance).toFixed(1));
}

function consistencyLabel(stdDev) {
  if (stdDev === null) return null;
  if (stdDev <= 1) return 'Very consistent';
  if (stdDev <= 2) return 'Consistent';
  return 'Variable';
}

// Groups every *question-level* evaluation across all interviews by some derived key
// (e.g. question type) - this is more granular than the interview-level overallScore
// Dashboard already shows, since a single "mixed" interview contains multiple types.
function breakdownByResponse(interviews, getKey) {
  const buckets = {};

  interviews.forEach((interview) => {
    (interview.responses || []).forEach((response) => {
      const score = response?.evaluation?.score;
      if (typeof score !== 'number') return;
      const key = getKey(response, interview);
      if (!key) return;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(score);
    });
  });

  return Object.fromEntries(
    Object.entries(buckets).map(([key, scores]) => [key, { average: average(scores), count: scores.length }]),
  );
}

// Groups whole-interview overallScores by some derived key (e.g. role, mode). Returned
// sorted by how often that key was practiced, most-practiced first.
function breakdownByInterview(interviews, getKey) {
  const buckets = {};

  interviews.forEach((interview) => {
    if (typeof interview.overallScore !== 'number') return;
    const key = getKey(interview);
    if (!key) return;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(interview.overallScore);
  });

  return Object.entries(buckets)
    .map(([key, scores]) => ({ key, average: average(scores), count: scores.length }))
    .sort((a, b) => b.count - a.count);
}

// Compares the average of the most recent interviews against the batch before them, so
// the person can see whether they're actually improving, not just what their scores are.
// Assumes `interviews` is sorted most-recent-first (as fetchUserInterviews returns it).
function computeTrend(interviews) {
  const scores = interviews.map((interview) => interview.overallScore).filter((score) => typeof score === 'number');
  if (scores.length < 2) return null;

  const windowSize = Math.min(5, Math.floor(scores.length / 2)) || 1;
  const recent = scores.slice(0, windowSize);
  const previous = scores.slice(windowSize, windowSize * 2);
  if (!previous.length) return null;

  const recentAverage = average(recent);
  const previousAverage = average(previous);
  const delta = Number((recentAverage - previousAverage).toFixed(1));

  return {
    recentAverage,
    previousAverage,
    delta,
    direction: delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat',
  };
}

// Ascending-by-date, for charting a left-to-right timeline (fetchUserInterviews returns
// most-recent-first, which is right for lists but backwards for a trend line).
function scoreOverTime(interviews) {
  return interviews
    .filter((interview) => typeof interview.overallScore === 'number')
    .slice()
    .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0))
    .map((interview) => ({
      id: interview.id,
      date: interview.createdAt,
      score: interview.overallScore,
      role: interview.role,
    }));
}

// Unlike breakdownByInterview, a single interview can contribute to *multiple* buckets here
// (one per skill tag chosen at setup), so this doesn't reuse that helper directly.
function breakdownBySkill(interviews) {
  const buckets = {};

  interviews.forEach((interview) => {
    if (typeof interview.overallScore !== 'number') return;
    (interview.skills || []).forEach((skill) => {
      if (!buckets[skill]) buckets[skill] = [];
      buckets[skill].push(interview.overallScore);
    });
  });

  return Object.entries(buckets)
    .map(([key, scores]) => ({ key, average: average(scores), count: scores.length }))
    .sort((a, b) => b.count - a.count);
}

function computeAnalytics(interviews) {
  const list = interviews || [];
  const overallScores = list.map((interview) => interview.overallScore).filter((score) => typeof score === 'number');
  const consistency = standardDeviation(overallScores);

  return {
    totalInterviews: list.length,
    totalQuestions: list.reduce((sum, interview) => sum + (interview.responses?.length || interview.questionCount || 0), 0),
    overallAverage: average(overallScores),
    consistency,
    consistencyLabel: consistencyLabel(consistency),
    trend: computeTrend(list),
    scoreOverTime: scoreOverTime(list),
    byQuestionType: breakdownByResponse(list, (response) => response.type),
    byDifficulty: breakdownByResponse(list, (_response, interview) => interview.difficulty),
    byRole: breakdownByInterview(list, (interview) => interview.role || 'Unknown role'),
    bySkill: breakdownBySkill(list),
    byMode: breakdownByInterview(list, (interview) => (interview.mode === 'adaptive' ? 'Adaptive' : 'Fixed')),
    byResumeUsage: breakdownByInterview(list, (interview) => (interview.resumeUsed ? 'Resume-tailored' : 'Standard')),
  };
}

export { average, standardDeviation, consistencyLabel, computeTrend, scoreOverTime, computeAnalytics };
