import { PDFParse } from 'pdf-parse';
import AppError from '../utils/AppError.js';

// Resumes vary wildly in length; this bounds what we ever forward into a Gemini prompt,
// independent of the (much larger) raw file-size limit enforced at the multer layer.
const MAX_EXTRACTED_TEXT_LENGTH = 15000;
const MIN_EXTRACTED_TEXT_LENGTH = 30;

function cleanExtractedText(rawText) {
  return (rawText || '')
    // pdf-parse inserts "-- N of M --" page separators into the combined text; strip them
    // so they don't leak into the AI prompt or confuse the structuring step.
    .replace(/--\s*\d+\s*of\s*\d+\s*--/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractTextFromPdf(buffer) {
  let parser;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = cleanExtractedText(result?.text);

    if (!text || text.length < MIN_EXTRACTED_TEXT_LENGTH) {
      // Most likely a scanned/image-only PDF with no embedded text layer. OCR is out of
      // scope for now - fail with a message that tells the user what to do instead.
      throw new AppError(
        "We couldn't find readable text in that PDF. If it's a scanned image, please upload a text-based export instead.",
        { statusCode: 400, code: 'RESUME_EMPTY', expose: true },
      );
    }

    return text.length > MAX_EXTRACTED_TEXT_LENGTH
      ? text.slice(0, MAX_EXTRACTED_TEXT_LENGTH)
      : text;
  } catch (error) {
    if (error instanceof AppError) throw error;

    console.error('PDF text extraction failed:', error);
    throw new AppError(
      'We could not read that PDF. Please make sure it is a valid, non-corrupted PDF file.',
      { statusCode: 400, code: 'RESUME_PARSE_FAILED', expose: true },
    );
  } finally {
    if (parser?.destroy) {
      await parser.destroy().catch(() => {});
    }
  }
}

export { extractTextFromPdf, MAX_EXTRACTED_TEXT_LENGTH };
