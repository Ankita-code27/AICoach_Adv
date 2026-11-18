import {
  evaluateInterviewAnswer,
  evaluateCodeAnswer,
  generateInterviewQuestions,
  generateNextQuestion,
  generateCodingProblemSet,
  generateNextCodingProblem,
  getAdaptiveBounds,
} from '../services/groq.service.js';
import { saveCompletedInterview } from '../services/interview.service.js';
import { validateStartInterview, validateNextQuestionRequest, validateProblemSpec } from '../validators/interview.validator.js';
import { validateAnswerEvaluation, validateCompletedInterview } from '../validators/evaluation.validator.js';
import AppError from '../utils/AppError.js';

async function startInterview(request, response, next) {
  try {
    const setup = validateStartInterview(request.body);
    const isCoding = setup.interviewType === 'coding';

    if (setup.mode === 'adaptive') {
      const result = isCoding
        ? await generateNextCodingProblem({ ...setup, history: [], targetQuestionCount: setup.numberOfQuestions })
        : await generateNextQuestion({ ...setup, history: [], targetQuestionCount: setup.numberOfQuestions });

      if (result.done) {
        // Extremely unlikely on the very first question, but the server never trusts
        // the AI unconditionally - fail loudly rather than silently return no question.
        throw new AppError('Unable to start the interview. Please try again.', {
          statusCode: 502,
          code: 'AI_INVALID_RESPONSE',
          expose: true,
        });
      }

      return response.status(200).json({
        role: setup.role,
        difficulty: setup.difficulty,
        interviewType: setup.interviewType,
        mode: 'adaptive',
        targetQuestionCount: setup.numberOfQuestions,
        language: setup.language,
        questions: isCoding
          ? [{ id: 1, question: result.question, type: 'coding', problemSpec: result.problemSpec, language: setup.language }]
          : [{ id: 1, question: result.question, type: result.type }],
      });
    }

    const questions = isCoding
      ? await generateCodingProblemSet(setup)
      : await generateInterviewQuestions(setup);

    response.status(200).json({
      role: setup.role,
      difficulty: setup.difficulty,
      interviewType: setup.interviewType,
      mode: 'fixed',
      language: setup.language,
      questions,
    });
  } catch (error) {
    next(error);
  }
}

async function getNextQuestion(request, response, next) {
  try {
    const payload = validateNextQuestionRequest(request.body);
    const { hardCap } = getAdaptiveBounds(payload.targetQuestionCount);

    // Server-side safety net: never call the AI again once the hard cap is reached,
    // regardless of what the model would have decided.
    if (payload.history.length >= hardCap) {
      return response.status(200).json({ done: true });
    }

    const result = payload.interviewType === 'coding'
      ? await generateNextCodingProblem(payload)
      : await generateNextQuestion(payload);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function evaluateInterview(request, response, next) {
  try {
    const answer = validateAnswerEvaluation(request.body);

    if (answer.questionType === 'coding') {
      const problemSpec = validateProblemSpec(request.body?.problemSpec);
      const evaluation = await evaluateCodeAnswer({ ...answer, problemSpec });
      return response.status(200).json({ evaluation });
    }

    const evaluation = await evaluateInterviewAnswer(answer);
    response.status(200).json({ evaluation });
  } catch (error) {
    next(error);
  }
}

async function completeInterview(request, response, next) {
  try {
    const interview = validateCompletedInterview(request.body);
    const result = await saveCompletedInterview({ ...interview, userId: request.user.uid });
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export { completeInterview, evaluateInterview, getNextQuestion, startInterview };
