// Shared limits referenced by more than one module. Keeping them here avoids the same
// number (and its meaning) drifting out of sync between the adaptive-bounds logic in
// groq.service.js and the completed-interview shape check in evaluation.validator.js.

// Fixed-mode question count is capped at 20 (see validateQuestionCount in
// interview.validator.js). Adaptive mode can run up to 5 questions past whatever target
// the candidate picked, so the absolute ceiling across both modes is 20 + 5 = 25.
const MAX_QUESTION_COUNT = 20;
const ADAPTIVE_OVERRUN_ALLOWANCE = 5;
const MAX_INTERVIEW_QUESTIONS = Math.min(25, MAX_QUESTION_COUNT + ADAPTIVE_OVERRUN_ALLOWANCE);

export { MAX_QUESTION_COUNT, ADAPTIVE_OVERRUN_ALLOWANCE, MAX_INTERVIEW_QUESTIONS };
