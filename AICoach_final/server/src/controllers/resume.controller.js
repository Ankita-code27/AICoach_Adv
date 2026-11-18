import { extractTextFromPdf } from '../services/resumeParser.service.js';
import { structureResume } from '../services/groq.service.js';
import { validateResumeFile } from '../validators/resume.validator.js';

// The raw PDF and its extracted text are never persisted - only the structured JSON this
// returns is (optionally) carried forward by the client into /interview/start, /next, and
// /evaluate. This keeps a potentially PII-heavy document out of Firestore and out of logs.
async function parseResume(request, response, next) {
  try {
    const file = validateResumeFile(request.file);
    const resumeText = await extractTextFromPdf(file.buffer);
    const resumeContext = await structureResume(resumeText);
    response.status(200).json({ resumeContext });
  } catch (error) {
    next(error);
  }
}

export { parseResume };
