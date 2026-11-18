import AppError from '../utils/AppError.js';

const difficulties = new Set(['easy', 'medium', 'hard']);
const interviewTypes = new Set(['technical', 'behavioral', 'coding', 'mixed']);
const questionTypes = new Set(['technical', 'behavioral', 'situational', 'coding']);
const interviewModes = new Set(['fixed', 'adaptive']);
// Kept intentionally small and server-validated (never passed through to the AI as free
// text) so the prompt-building code in groq.service.js can safely interpolate it.
const supportedCodingLanguages = new Set([
  'javascript',
  'typescript',
  'python',
  'java',
  'csharp',
  'cpp',
  'go',
]);
const MAX_HISTORY_LENGTH = 25;
const MAX_CODE_LENGTH = 20000;

function validateLanguage(value) {
  const language = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!language) return null;
  if (!supportedCodingLanguages.has(language)) {
    throw new AppError('Unsupported programming language.', {
      statusCode: 400,
      code: 'INVALID_LANGUAGE',
      expose: true,
    });
  }
  return language;
}

function validateRole(value) {
  const role = typeof value === 'string' ? value.trim() : '';
  if (role.length < 2 || role.length > 100) {
    throw new AppError('Role must be between 2 and 100 characters.', {
      statusCode: 400,
      code: 'INVALID_ROLE',
      expose: true,
    });
  }
  return role;
}

function validateDifficulty(value) {
  const difficulty = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!difficulties.has(difficulty)) {
    throw new AppError('Difficulty must be easy, medium, or hard.', {
      statusCode: 400,
      code: 'INVALID_DIFFICULTY',
      expose: true,
    });
  }
  return difficulty;
}

function validateInterviewType(value) {
  const interviewType = typeof value === 'string' && value.trim()
    ? value.trim().toLowerCase()
    : 'mixed';
  if (!interviewTypes.has(interviewType)) {
    throw new AppError('Interview type must be technical, behavioral, or mixed.', {
      statusCode: 400,
      code: 'INVALID_INTERVIEW_TYPE',
      expose: true,
    });
  }
  return interviewType;
}

function validateQuestionCount(value, field = 'numberOfQuestions') {
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw new AppError(`${field} must be an integer between 1 and 20.`, {
      statusCode: 400,
      code: 'INVALID_QUESTION_COUNT',
      expose: true,
    });
  }
  return value;
}

function validateSkills(value) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value) || value.length > 8) {
    throw new AppError('You can list up to 8 skills or technologies.', {
      statusCode: 400,
      code: 'INVALID_SKILLS',
      expose: true,
    });
  }

  const skills = value
    .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
    .filter(Boolean);

  if (skills.some((skill) => skill.length > 40)) {
    throw new AppError('Each skill must be 40 characters or fewer.', {
      statusCode: 400,
      code: 'INVALID_SKILLS',
      expose: true,
    });
  }

  return [...new Set(skills)];
}

function validateJobDescription(value) {
  if (value === undefined || value === null || value === '') return '';

  const jobDescription = typeof value === 'string' ? value.trim() : '';
  if (jobDescription.length > 4000) {
    throw new AppError('Job description must be 4000 characters or fewer.', {
      statusCode: 400,
      code: 'INVALID_JOB_DESCRIPTION',
      expose: true,
    });
  }

  return jobDescription;
}

function validateMode(value) {
  const mode = typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'fixed';
  if (!interviewModes.has(mode)) {
    throw new AppError('Interview mode must be fixed or adaptive.', {
      statusCode: 400,
      code: 'INVALID_INTERVIEW_MODE',
      expose: true,
    });
  }
  return mode;
}

function sanitizeStringArray(value, { maxItems, maxItemLength }) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxItemLength));
}

// Resume context always originates from our own /resume/parse endpoint in the normal
// flow, but the client round-trips it back to us on /start, /next, and /evaluate, so it's
// untrusted input by the time it reaches these validators. Unlike the other fields here,
// a malformed resumeContext shouldn't block the whole interview from starting - it's
// enrichment, not a required input - so this sanitizes defensively (capping lengths and
// dropping anything malformed) instead of throwing.
function validateResumeContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const summary = typeof value.summary === 'string' ? value.summary.trim().slice(0, 1000) : '';
  const skills = sanitizeStringArray(value.skills, { maxItems: 25, maxItemLength: 60 });
  const yearsOfExperience = Number.isInteger(value.yearsOfExperience)
    ? Math.min(60, Math.max(0, value.yearsOfExperience))
    : null;

  const roles = Array.isArray(value.roles)
    ? value.roles
      .slice(0, 8)
      .map((role) => ({
        title: typeof role?.title === 'string' ? role.title.trim().slice(0, 150) : '',
        company: typeof role?.company === 'string' ? role.company.trim().slice(0, 150) : '',
        highlights: sanitizeStringArray(role?.highlights, { maxItems: 6, maxItemLength: 300 }),
      }))
      .filter((role) => role.title)
    : [];

  const projects = Array.isArray(value.projects)
    ? value.projects
      .slice(0, 8)
      .map((project) => ({
        name: typeof project?.name === 'string' ? project.name.trim().slice(0, 150) : '',
        description: typeof project?.description === 'string' ? project.description.trim().slice(0, 500) : '',
      }))
      .filter((project) => project.name)
    : [];

  if (!summary && !skills.length && !roles.length && !projects.length) return null;

  return { summary, skills, yearsOfExperience, roles, projects };
}

function validateStartInterview(body) {
  const role = validateRole(body?.role);
  const difficulty = validateDifficulty(body?.difficulty);
  const interviewType = validateInterviewType(body?.interviewType);
  const numberOfQuestions = validateQuestionCount(body?.numberOfQuestions);
  const mode = validateMode(body?.mode);
  const skills = validateSkills(body?.skills);
  const jobDescription = validateJobDescription(body?.jobDescription);
  const resumeContext = validateResumeContext(body?.resumeContext);
  // Only meaningful (and only required) when interviewType is 'coding'; validateLanguage
  // returns null for an empty value, and the controller decides what to do with that.
  const language = validateLanguage(body?.language);

  if (interviewType === 'coding' && !language) {
    throw new AppError('Please choose a programming language for a coding interview.', {
      statusCode: 400,
      code: 'INVALID_LANGUAGE',
      expose: true,
    });
  }

  return { role, difficulty, numberOfQuestions, interviewType, mode, skills, jobDescription, resumeContext, language };
}

// A coding history entry carries `code`/`language` instead of a prose `answer` - both
// shapes are normalized to a common `answer` string internally (see groq.service.js's
// formatHistoryForPrompt) so the rest of the adaptive pipeline doesn't need to branch on it.
function validateHistoryItem(item) {
  const question = typeof item?.question === 'string' ? item.question.trim() : '';
  const type = typeof item?.type === 'string' ? item.type.trim().toLowerCase() : '';
  const score = item?.score;

  if (!question || question.length > 1000 || !questionTypes.has(type) || !Number.isInteger(score) || score < 0 || score > 10) {
    throw new AppError('The interview history contains invalid data.', {
      statusCode: 400,
      code: 'INVALID_HISTORY',
      expose: true,
    });
  }

  if (type === 'coding') {
    const code = typeof item?.code === 'string' ? item.code.trim() : '';
    const language = validateLanguage(item?.language);
    if (!code || code.length > MAX_CODE_LENGTH || !language) {
      throw new AppError('The interview history contains invalid data.', {
        statusCode: 400,
        code: 'INVALID_HISTORY',
        expose: true,
      });
    }
    return { question, type, answer: code, language, score };
  }

  const answer = typeof item?.answer === 'string' ? item.answer.trim() : '';
  if (!answer || answer.length > 10000) {
    throw new AppError('The interview history contains invalid data.', {
      statusCode: 400,
      code: 'INVALID_HISTORY',
      expose: true,
    });
  }

  return { question, type, answer, score };
}

function validateNextQuestionRequest(body) {
  const role = validateRole(body?.role);
  const difficulty = validateDifficulty(body?.difficulty);
  const interviewType = validateInterviewType(body?.interviewType);
  const targetQuestionCount = validateQuestionCount(body?.targetQuestionCount, 'targetQuestionCount');
  const skills = validateSkills(body?.skills);
  const jobDescription = validateJobDescription(body?.jobDescription);
  const resumeContext = validateResumeContext(body?.resumeContext);
  const language = validateLanguage(body?.language);

  if (interviewType === 'coding' && !language) {
    throw new AppError('Please choose a programming language for a coding interview.', {
      statusCode: 400,
      code: 'INVALID_LANGUAGE',
      expose: true,
    });
  }

  const rawHistory = Array.isArray(body?.history) ? body.history : [];
  if (rawHistory.length > MAX_HISTORY_LENGTH) {
    throw new AppError('The interview history is longer than expected.', {
      statusCode: 400,
      code: 'INVALID_HISTORY',
      expose: true,
    });
  }
  const history = rawHistory.map(validateHistoryItem);

  return { role, difficulty, interviewType, targetQuestionCount, skills, jobDescription, resumeContext, language, history };
}

// Like resumeContext, a coding problem's spec is generated by our own /start or /next
// endpoint but round-tripped back to us by the client on /evaluate, so it's untrusted by
// the time it arrives here. Sanitized defensively (capped lengths, malformed items
// dropped) rather than thrown on, since it's context for the evaluation prompt, not a
// value the response strictly depends on being present in a specific shape.
function validateProblemSpec(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('The coding problem details are required to evaluate code.', {
      statusCode: 400,
      code: 'MISSING_PROBLEM_SPEC',
      expose: true,
    });
  }

  const title = typeof value.title === 'string' ? value.title.trim().slice(0, 150) : '';
  const prompt = typeof value.prompt === 'string' ? value.prompt.trim().slice(0, 4000) : '';

  if (!title || !prompt) {
    throw new AppError('The coding problem details are required to evaluate code.', {
      statusCode: 400,
      code: 'MISSING_PROBLEM_SPEC',
      expose: true,
    });
  }

  const constraints = Array.isArray(value.constraints)
    ? value.constraints
      .filter((item) => typeof item === 'string' && item.trim())
      .slice(0, 6)
      .map((item) => item.trim().slice(0, 300))
    : [];

  const examples = Array.isArray(value.examples)
    ? value.examples
      .slice(0, 5)
      .map((example) => ({
        input: typeof example?.input === 'string' ? example.input.trim().slice(0, 500) : '',
        output: typeof example?.output === 'string' ? example.output.trim().slice(0, 500) : '',
        explanation: typeof example?.explanation === 'string' ? example.explanation.trim().slice(0, 500) : '',
      }))
      .filter((example) => example.input && example.output)
    : [];

  return { title, prompt, constraints, examples };
}

export {
  validateStartInterview,
  validateNextQuestionRequest,
  validateResumeContext,
  validateSkills,
  validateJobDescription,
  validateLanguage,
  validateProblemSpec,
  MAX_CODE_LENGTH,
};
