import { API_BASE_URL } from './http.js';

async function generateInterview({ role, difficulty, questionCount, interviewType, skills, jobDescription, mode = 'fixed', resumeContext = null, language = null }, idToken) {
  const payload = await requestInterviewApi('/interview/start', {
    role,
    difficulty,
    numberOfQuestions: questionCount,
    interviewType,
    skills,
    jobDescription,
    mode,
    resumeContext,
    language,
  }, idToken);

  const expectedLength = mode === 'adaptive' ? 1 : questionCount;
  if (!Array.isArray(payload.questions) || payload.questions.length !== expectedLength) {
    throw new Error("We couldn't generate the interview. Please try again.");
  }

  return payload;
}

async function getNextQuestion({ role, difficulty, interviewType, skills, jobDescription, resumeContext = null, history, targetQuestionCount, language = null }, idToken) {
  const payload = await requestInterviewApi('/interview/next', {
    role,
    difficulty,
    interviewType,
    skills,
    jobDescription,
    resumeContext,
    history,
    targetQuestionCount,
    language,
  }, idToken);

  if (typeof payload.done !== 'boolean') {
    throw new Error("We couldn't prepare the next question. Please try again.");
  }

  if (!payload.done && (!payload.question || !payload.type)) {
    throw new Error("We couldn't prepare the next question. Please try again.");
  }

  return payload;
}

// `answer` is a plain string for prose questions, or { code, language } for coding
// questions - the latter also requires `problemSpec` so the server can evaluate the
// submission against the problem it originally generated.
async function evaluateAnswer({ question, answer, role, difficulty, skills, jobDescription, resumeContext = null, questionType = 'technical', problemSpec = null }, idToken) {
  const isCoding = questionType === 'coding';
  const payload = await requestInterviewApi('/interview/evaluate', {
    question,
    role,
    difficulty,
    skills,
    jobDescription,
    resumeContext,
    questionType,
    ...(isCoding
      ? { code: answer?.code, language: answer?.language, problemSpec }
      : { answer }),
  }, idToken);

  if (!payload.evaluation || !Number.isInteger(payload.evaluation.score)) {
    throw new Error('Unable to evaluate your answer right now. Please try again.');
  }

  return payload.evaluation;
}

async function saveCompletedInterview(session, idToken) {
  const method = session.interviewMethod || (session.voiceMode ? 'voice' : 'written');
  return requestInterviewApi('/interview/complete', {
    role: session.role,
    difficulty: session.difficulty,
    interviewType: session.interviewType,
    mode: session.mode,
    method,
    questions: session.questions,
    answers: session.answers,
    evaluations: session.evaluations,
    resumeContext: session.resumeContext || null,
    skills: session.skills || [],
    voiceMode: method === 'voice',
    language: session.language || null,
  }, idToken);
}

async function requestInterviewApi(path, body, idToken) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${idToken}`,
    },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Unable to reach the interview service. Please try again.');
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    // Use the generic message below when a proxy or server returns non-JSON.
  }

  if (!response.ok) {
    throw new Error(payload.message || 'The interview service could not complete your request. Please try again.');
  }

  return payload;
}

export { evaluateAnswer, generateInterview, getNextQuestion, saveCompletedInterview };
