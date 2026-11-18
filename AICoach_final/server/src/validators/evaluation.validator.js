import AppError from '../utils/AppError.js';
import { validateResumeContext, validateSkills, validateJobDescription, validateLanguage, MAX_CODE_LENGTH } from './interview.validator.js';
import { MAX_INTERVIEW_QUESTIONS } from '../constants.js';

const difficulties = new Set(['easy', 'medium', 'hard']);
const interviewTypes = new Set(['technical', 'behavioral', 'coding', 'mixed']);
const interviewModes = new Set(['fixed', 'adaptive']);
const interviewMethods = new Set(['written', 'voice']);
const questionTypes = new Set(['technical', 'behavioral', 'situational', 'coding']);
// MAX_INTERVIEW_QUESTIONS lives in constants.js so it can't drift out of sync with the
// adaptive hard cap in groq.service.js's getAdaptiveBounds - an adaptive session can
// legitimately produce up to 25 questions, more than fixed mode's 20-question max.

function readText(value, field, { min = 1, max }) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min || text.length > max) {
    throw new AppError(`${field} must be between ${min} and ${max} characters.`, {
      statusCode: 400,
      code: `INVALID_${field.toUpperCase().replaceAll(' ', '_')}`,
      expose: true,
    });
  }
  return text;
}

function validateAnswerEvaluation(body) {
  const question = readText(body?.question, 'question', { min: 2, max: 1000 });
  const role = readText(body?.role, 'role', { min: 2, max: 100 });
  const difficulty = typeof body?.difficulty === 'string' ? body.difficulty.trim().toLowerCase() : '';
  const questionType = typeof body?.questionType === 'string' ? body.questionType.trim().toLowerCase() : '';

  if (!difficulties.has(difficulty)) {
    throw new AppError('Difficulty must be easy, medium, or hard.', {
      statusCode: 400,
      code: 'INVALID_DIFFICULTY',
      expose: true,
    });
  }

  const skills = validateSkills(body?.skills);
  const jobDescription = validateJobDescription(body?.jobDescription);
  const resumeContext = validateResumeContext(body?.resumeContext);

  if (questionType === 'coding') {
    const code = readText(body?.code, 'code', { min: 1, max: MAX_CODE_LENGTH });
    const language = validateLanguage(body?.language);
    if (!language) {
      throw new AppError('A programming language is required to evaluate code.', {
        statusCode: 400,
        code: 'INVALID_LANGUAGE',
        expose: true,
      });
    }
    return { question, role, difficulty, skills, jobDescription, resumeContext, questionType, code, language };
  }

  const answer = readText(body?.answer, 'answer', { min: 1, max: 10000 });
  return { question, answer, role, difficulty, skills, jobDescription, resumeContext, questionType };
}

function validateCompletedInterview(body) {
  const role = readText(body?.role, 'role', { min: 2, max: 100 });
  const difficulty = typeof body?.difficulty === 'string' ? body.difficulty.trim().toLowerCase() : '';
  const interviewType = typeof body?.interviewType === 'string' && interviewTypes.has(body.interviewType.trim().toLowerCase())
    ? body.interviewType.trim().toLowerCase()
    : 'mixed';
  const mode = typeof body?.mode === 'string' && interviewModes.has(body.mode.trim().toLowerCase())
    ? body.mode.trim().toLowerCase()
    : 'fixed';
  const questions = Array.isArray(body?.questions) ? body.questions : [];
  const answers = body?.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers : null;
  const evaluations = body?.evaluations && typeof body.evaluations === 'object' && !Array.isArray(body.evaluations) ? body.evaluations : null;
  const resumeContext = validateResumeContext(body?.resumeContext);
  // Persisted so analytics can later break scores down per skill the candidate chose to
  // practice, without re-deriving it from responses (which don't carry the skill tags).
  const skills = validateSkills(body?.skills);
  const method = typeof body?.method === 'string' && interviewMethods.has(body.method.trim().toLowerCase())
    ? body.method.trim().toLowerCase()
    : (body?.voiceMode ? 'voice' : 'written');
  const voiceMode = method === 'voice' || Boolean(body?.voiceMode);
  const language = interviewType === 'coding' ? validateLanguage(body?.language) : null;

  if (!difficulties.has(difficulty)) {
    throw new AppError('Difficulty must be easy, medium, or hard.', { statusCode: 400, code: 'INVALID_DIFFICULTY', expose: true });
  }
  if (!questions.length || questions.length > MAX_INTERVIEW_QUESTIONS || !answers || !evaluations) {
    throw new AppError('A completed interview must include questions, answers, and evaluations.', { statusCode: 400, code: 'INVALID_INTERVIEW_RESULT', expose: true });
  }

  const responses = questions.map((item, index) => {
    const id = Number.isInteger(item?.id) ? item.id : null;
    const question = typeof item?.question === 'string' ? item.question.trim() : '';
    const type = typeof item?.type === 'string' ? item.type.trim().toLowerCase() : '';
    const evaluation = evaluations[id];
    const score = evaluation?.score;
    const rawAnswer = answers[id];

    if (id !== index + 1 || !question || question.length > 1000 || !questionTypes.has(type)
      || !Number.isInteger(score) || score < 0 || score > 10) {
      throw new AppError('The completed interview contains invalid data.', { statusCode: 400, code: 'INVALID_INTERVIEW_RESULT', expose: true });
    }

    if (type === 'coding') {
      // The client stores a coding answer as { code, language } rather than a plain
      // string - see InterviewContext.jsx's saveAnswer usage in InterviewSessionPage.jsx.
      const code = typeof rawAnswer?.code === 'string' ? rawAnswer.code.trim() : '';
      // Every failure in this responses[] loop reports the same INVALID_INTERVIEW_RESULT
      // code (malformed response data), unlike /start or /evaluate where INVALID_LANGUAGE
      // is a standalone user-facing rejection - so an unsupported per-answer language is
      // folded into that same generic error rather than propagating validateLanguage's own
      // AppError code.
      let language;
      try {
        language = validateLanguage(rawAnswer?.language);
      } catch {
        language = null;
      }
      if (!code || code.length > MAX_CODE_LENGTH || !language) {
        throw new AppError('The completed interview contains invalid data.', { statusCode: 400, code: 'INVALID_INTERVIEW_RESULT', expose: true });
      }
      return { questionId: id, question, type, answer: code, language, evaluation };
    }

    const answer = typeof rawAnswer === 'string' ? rawAnswer.trim() : '';
    if (!answer || answer.length > 10000) {
      throw new AppError('The completed interview contains invalid data.', { statusCode: 400, code: 'INVALID_INTERVIEW_RESULT', expose: true });
    }

    return { questionId: id, question, type, answer, evaluation };
  });

  const overallScore = Number((responses.reduce((total, response) => total + response.evaluation.score, 0) / responses.length).toFixed(1));
  return { role, difficulty, interviewType, mode, method, responses, overallScore, resumeContext, skills, voiceMode, language };
}

export { validateAnswerEvaluation, validateCompletedInterview };
