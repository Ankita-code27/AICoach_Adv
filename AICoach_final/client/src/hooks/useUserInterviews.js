import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchUserInterviews } from '../services/interviews.js';

function useUserInterviews() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const results = await fetchUserInterviews(user.uid);
        if (!cancelled) setInterviews(results);
      } catch {
        if (!cancelled) setError('Unable to load your interview history right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user.uid, reloadToken]);

  function refetch() {
    setReloadToken((token) => token + 1);
  }

  return { interviews, loading, error, refetch };
}

function computeInterviewStats(interviews) {
  if (!interviews || !interviews.length) {
    return { total: 0, averageScore: null, bestScore: null, latestScore: null, recent: [] };
  }

  const scores = interviews.map((interview) => interview.overallScore).filter((score) => typeof score === 'number');
  const total = interviews.length;
  const averageScore = scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)) : null;
  const bestScore = scores.length ? Math.max(...scores) : null;
  const latestScore = interviews[0]?.overallScore ?? null;
  const recent = interviews.slice(0, 5);

  return { total, averageScore, bestScore, latestScore, recent };
}

export { useUserInterviews, computeInterviewStats };
