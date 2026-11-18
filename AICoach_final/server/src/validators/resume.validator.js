import AppError from '../utils/AppError.js';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function validateResumeFile(file) {
  if (!file) {
    throw new AppError('A PDF resume file is required.', {
      statusCode: 400,
      code: 'MISSING_RESUME_FILE',
      expose: true,
    });
  }

  if (file.mimetype !== 'application/pdf') {
    throw new AppError('Resume must be a PDF file.', {
      statusCode: 400,
      code: 'INVALID_RESUME_FILE_TYPE',
      expose: true,
    });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError('Resume file must be 5MB or smaller.', {
      statusCode: 400,
      code: 'RESUME_FILE_TOO_LARGE',
      expose: true,
    });
  }

  return file;
}

export { validateResumeFile, MAX_FILE_SIZE_BYTES };
