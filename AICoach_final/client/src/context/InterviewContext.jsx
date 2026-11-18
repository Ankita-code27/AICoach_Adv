import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'ai-interview-coach.session';
const InterviewContext = createContext(null);

function readStoredSession() {
  try {
    const storedSession = sessionStorage.getItem(STORAGE_KEY);
    if (!storedSession) return null;
    const session = JSON.parse(storedSession);
    return { ...session, answers: session.answers || {}, evaluations: session.evaluations || {} };
  } catch {
    return null;
  }
}

function InterviewProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  useEffect(() => {
    try {
      if (session) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // The interview still works for the current page if storage is unavailable.
    }
  }, [session]);

  function startSession({ role, difficulty, interviewType, questions, skills, jobDescription, mode, targetQuestionCount, resumeContext, interviewMethod, voiceMode, language }) {
    const resolvedMethod = interviewMethod || (voiceMode ? 'voice' : 'written');
    setSession({
      role,
      difficulty,
      interviewType: interviewType || 'mixed',
      skills: skills || [],
      jobDescription: jobDescription || '',
      resumeContext: resumeContext || null,
      mode: mode === 'adaptive' ? 'adaptive' : 'fixed',
      targetQuestionCount: targetQuestionCount || questions.length,
      interviewMethod: resolvedMethod,
      voiceMode: resolvedMethod === 'voice',
      // Only meaningful when interviewType is 'coding'; unused (null) otherwise.
      language: language || null,
      questions,
      answers: {},
      evaluations: {},
      currentQuestionIndex: 0,
      completed: false,
    });
  }

  // Adaptive mode generates one question at a time, so the question list grows as the
  // interview progresses instead of being fully populated up front like fixed mode.
  function appendQuestion(question) {
    setSession((currentSession) => {
      if (!currentSession) return currentSession;
      return { ...currentSession, questions: [...currentSession.questions, question] };
    });
  }

  function saveAnswer(questionId, answer) {
    setSession((currentSession) => {
      if (!currentSession) return currentSession;

      return {
        ...currentSession,
        answers: {
          ...currentSession.answers,
          [questionId]: answer,
        },
      };
    });
  }

  function moveToNextQuestion() {
    setSession((currentSession) => {
      if (!currentSession) return currentSession;
      return { ...currentSession, currentQuestionIndex: currentSession.currentQuestionIndex + 1 };
    });
  }

  function saveEvaluation(questionId, evaluation) {
    setSession((currentSession) => {
      if (!currentSession) return currentSession;
      return { ...currentSession, evaluations: { ...currentSession.evaluations, [questionId]: evaluation } };
    });
  }

  function completeSession(result) {
    setSession((currentSession) => (currentSession ? { ...currentSession, ...result, completed: true } : currentSession));
  }

  function clearSession() {
    setSession(null);
  }

  const value = useMemo(() => ({ session, startSession, appendQuestion, saveAnswer, saveEvaluation, moveToNextQuestion, completeSession, clearSession }), [session]);
  return <InterviewContext.Provider value={value}>{children}</InterviewContext.Provider>;
}

function useInterview() {
  const context = useContext(InterviewContext);
  if (!context) throw new Error('useInterview must be used inside an InterviewProvider.');
  return context;
}

export { InterviewProvider, useInterview };
