import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RotateCcw, LayoutDashboard, PartyPopper, RefreshCcw, ChevronDown, ChevronUp } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import EvaluationDetails from '../components/EvaluationDetails.jsx';
import { useInterview } from '../context/InterviewContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { generateInterview } from '../api/interview.js';
import PageBackground from '../layouts/PageBackground.jsx';

function buildSkillBreakdown(questions, evaluations) {
  const totals = {};

  questions.forEach((question) => {
    const evaluation = evaluations[question.id];
    if (!evaluation) return;
    if (!totals[question.type]) totals[question.type] = { sum: 0, count: 0 };
    totals[question.type].sum += evaluation.score;
    totals[question.type].count += 1;
  });

  return Object.entries(totals).map(([type, { sum, count }]) => ({
    type,
    averageScore: Number((sum / count).toFixed(1)),
    count,
  }));
}

function InterviewCompletePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { session, startSession, clearSession } = useInterview();
  const [expandedId, setExpandedId] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');

  if (!session) return <Navigate to="/interview/setup" replace />;
  if (!session.completed) return <Navigate to="/interview/session" replace />;

  const answerCount = Object.keys(session.answers).length;
  const evaluations = session.evaluations || {};
  const overallStrengths = [...new Set(Object.values(evaluations).flatMap((evaluation) => evaluation.strengths))].slice(0, 5);
  const improvementAreas = [...new Set(Object.values(evaluations).flatMap((evaluation) => evaluation.weaknesses))].slice(0, 5);
  const practiceAreas = [...new Set(Object.values(evaluations).flatMap((evaluation) => evaluation.suggestions))].slice(0, 5);
  const skillBreakdown = buildSkillBreakdown(session.questions, evaluations);

  function startAnotherInterview() {
    clearSession();
    navigate('/interview/setup', { replace: true });
  }

  function returnToDashboard() {
    clearSession();
    navigate('/dashboard', { replace: true });
  }

  async function retrySameInterview() {
    setError('');
    setRetrying(true);
    try {
      const idToken = await user.getIdToken();
      const interview = await generateInterview({
        role: session.role,
        difficulty: session.difficulty,
        // Retry with the same target length the user originally chose, not the exact
        // number of questions this particular run happened to end on (adaptive mode may
        // have ended a little earlier or later than the original target).
        questionCount: session.targetQuestionCount || session.questions.length,
        interviewType: session.interviewType,
        skills: session.skills,
        jobDescription: session.jobDescription,
        mode: session.mode,
        resumeContext: session.resumeContext,
      }, idToken);
      startSession({ ...interview, skills: session.skills, jobDescription: session.jobDescription, resumeContext: session.resumeContext });
      navigate('/interview/session', { replace: true });
    } catch (requestError) {
      setError(requestError.message || "We couldn't start a new attempt right now. Please try again.");
      setRetrying(false);
    }
  }

  return (
    <main className="interview-page">
      <PageBackground />
      <section className="card interview-card completion-card" aria-labelledby="completion-heading">
        <p className="eyebrow"><PartyPopper size={13} /> Interview complete</p>
        <h1 id="completion-heading">Great work—your practice session is finished.</h1>
        <div className="results-score">
          <span>Overall score</span>
          <strong>{session.overallScore?.toFixed(1)}<small>/10</small></strong>
          <span>{session.questions.length} questions · {session.role} · {session.interviewMethod === 'voice' || session.voiceMode ? 'Voice' : 'Written'} · {session.difficulty}</span>
        </div>
        <p className="completion-copy">You answered {answerCount} of {session.questions.length} questions for this {session.difficulty} {session.role} interview.</p>

        {skillBreakdown.length > 0 && (
          <section aria-label="Skill breakdown">
            <h2>Skill breakdown</h2>
            <div className="skill-breakdown">
              {skillBreakdown.map((item) => (
                <div className="skill-breakdown-row" key={item.type}>
                  <div className="skill-breakdown-label">
                    <span style={{ textTransform: 'capitalize' }}>{item.type}</span>
                    <span className="text-subtle">{item.averageScore}/10 · {item.count} question{item.count === 1 ? '' : 's'}</span>
                  </div>
                  <div className="progress-track" style={{ margin: 0 }}>
                    <div className="progress-value" style={{ width: `${item.averageScore * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section aria-label="Question-by-question analysis">
          <h2>Question-by-question analysis</h2>
          <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            {session.questions.map((question) => {
              const evaluation = evaluations[question.id];
              const expanded = expandedId === question.id;
              return (
                <div className="card card-muted" key={question.id}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: 0, justifyContent: 'space-between', width: '100%' }}
                    onClick={() => setExpandedId(expanded ? null : question.id)}
                    aria-expanded={expanded}
                  >
                    <div className="list-row-main" style={{ textAlign: 'left' }}>
                      <span className="list-row-title">Question {question.id}</span>
                      <span className="list-row-meta"><span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{question.type}</span></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <strong className="score-badge">{evaluation?.score ?? '—'}/10</strong>
                      {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>
                  {expanded && (
                    <div style={{ marginTop: 'var(--space-4)' }}>
                      <p className="question-type">{question.type}</p>
                      <h3>{question.question}</h3>
                      <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}><strong>Your answer: </strong>{session.answers[question.id]}</p>
                      <div className="evaluation-card" style={{ marginTop: 'var(--space-4)', padding: 0, border: 0, background: 'transparent' }}>
                        <EvaluationDetails evaluation={evaluation} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <ResultList title="Overall strengths" items={overallStrengths} />
        <ResultList title="Areas for improvement" items={improvementAreas} />
        <ResultList title="Recommended practice areas" items={practiceAreas} />

        <Alert variant="error">{error}</Alert>

        <div className="completion-actions">
          <button type="button" className="btn btn-primary" onClick={retrySameInterview} disabled={retrying}>
            {retrying ? <span className="btn-spinner" aria-hidden="true" /> : <RefreshCcw size={16} />}
            {retrying ? 'Preparing new questions...' : 'Retry this interview'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={startAnotherInterview} disabled={retrying}>
            <RotateCcw size={16} /> New interview
          </button>
          <button type="button" className="btn btn-ghost" onClick={returnToDashboard} disabled={retrying}>
            <LayoutDashboard size={16} /> Back to dashboard
          </button>
        </div>
      </section>
    </main>
  );
}

function ResultList({ title, items }) {
  if (!items.length) return null;
  return <section className="result-list"><h2>{title}</h2><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}

export default InterviewCompletePage;
