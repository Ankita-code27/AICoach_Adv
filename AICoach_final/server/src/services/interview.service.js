import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../config/firebaseAdmin.js';
import AppError from '../utils/AppError.js';

async function saveCompletedInterview({ userId, role, difficulty, interviewType, mode, method, responses, overallScore, resumeContext, skills, voiceMode, language }) {
  try {
    const document = await getAdminDb().collection('interviews').add({
      userId,
      role,
      difficulty,
      interviewType: interviewType || 'mixed',
      mode: mode === 'adaptive' ? 'adaptive' : 'fixed',
      method: method || (voiceMode ? 'voice' : 'written'),
      questionCount: responses.length,
      responses,
      overallScore,
      skills: Array.isArray(skills) ? skills : [],
      voiceMode: method === 'voice' || Boolean(voiceMode),
      // Only meaningful for interviewType === 'coding'; null otherwise.
      language: typeof language === 'string' && language ? language : null,
      // Stored so History/Analytics can later show "tailored to your resume" without
      // re-deriving it, and so a user can see what background the AI was working from.
      // Never the raw PDF or raw extracted text - only the already-bounded structured summary.
      resumeUsed: Boolean(resumeContext),
      resumeContext: resumeContext || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { interviewId: document.id, overallScore };
  } catch (error) {
    console.error('Unable to save completed interview:', error);
    throw new AppError('Unable to save your interview results right now. Please try again.', {
      statusCode: 503,
      code: 'INTERVIEW_SAVE_FAILED',
      expose: true,
    });
  }
}

export { saveCompletedInterview };
