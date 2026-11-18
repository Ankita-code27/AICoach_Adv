import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase.js';

/**
 * Fetches every saved interview belonging to the given user.
 *
 * Note: this only filters by userId (a single equality clause), which Firestore
 * can serve without a composite index. Sorting is done client-side after the
 * fetch, which keeps setup simple - for very large history sizes this could be
 * replaced with a server-side paginated query plus a composite index on
 * (userId, createdAt).
 */
async function fetchUserInterviews(uid) {
  const interviewsQuery = query(collection(db, 'interviews'), where('userId', '==', uid));
  const snapshot = await getDocs(interviewsQuery);

  const interviews = snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      role: data.role,
      difficulty: data.difficulty,
      interviewType: data.interviewType || 'mixed',
      mode: data.mode === 'adaptive' ? 'adaptive' : 'fixed',
      resumeUsed: Boolean(data.resumeUsed),
      method: data.method || (data.voiceMode ? 'voice' : 'written'),
      voiceMode: data.method ? data.method === 'voice' : Boolean(data.voiceMode),
      skills: Array.isArray(data.skills) ? data.skills : [],
      questionCount: data.questionCount,
      overallScore: data.overallScore,
      responses: data.responses || [],
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
    };
  });

  interviews.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  return interviews;
}

export { fetchUserInterviews };
