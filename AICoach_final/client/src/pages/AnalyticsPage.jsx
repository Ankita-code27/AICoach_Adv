import { Link } from 'react-router-dom';
import { Sparkles, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import AppHeader from '../components/AppHeader.jsx';
import PageBackground from '../layouts/PageBackground.jsx';
import Alert from '../components/Alert.jsx';
import ScoreTrend from '../components/ScoreTrend.jsx';
import ScoreBreakdownBar from '../components/ScoreBreakdownBar.jsx';
import { useUserInterviews } from '../hooks/useUserInterviews.js';
import { computeAnalytics } from '../utils/analytics.js';

const QUESTION_TYPE_ORDER = ['technical', 'behavioral', 'situational'];
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

function TrendPill({ trend }) {
  if (!trend) return null;

  const config = {
    up: { Icon: TrendingUp, label: `Up ${trend.delta > 0 ? '+' : ''}${trend.delta} vs. earlier sessions` },
    down: { Icon: TrendingDown, label: `Down ${trend.delta} vs. earlier sessions` },
    flat: { Icon: Minus, label: 'About the same as earlier sessions' },
  }[trend.direction];

  return (
    <span className={`trend-pill ${trend.direction}`}>
      <config.Icon size={13} /> {config.label}
    </span>
  );
}

function orderedEntries(bucket, order) {
  const present = order.filter((key) => bucket[key]);
  const extra = Object.keys(bucket).filter((key) => !order.includes(key));
  return [...present, ...extra].map((key) => ({ label: key, ...bucket[key] }));
}

function AnalyticsPage() {
  const { interviews, loading, error } = useUserInterviews();
  const analytics = computeAnalytics(interviews);

  const questionTypeRows = orderedEntries(analytics.byQuestionType, QUESTION_TYPE_ORDER);
  const difficultyRows = orderedEntries(analytics.byDifficulty, DIFFICULTY_ORDER);

  return (
    <div className="app-shell">
      <PageBackground />
      <AppHeader active="analytics" />

      <main className="app-main">
        <div className="page-header">
          <div className="page-title-group">
            <p className="eyebrow"><BarChart3 size={13} /> Analytics</p>
            <h1>Your performance, in depth</h1>
            <p>Trends and breakdowns pulled from every interview you've completed.</p>
          </div>
          <Link className="btn btn-primary btn-auto" to="/interview/setup">
            <Sparkles size={17} /> Start new interview
          </Link>
        </div>

        <Alert variant="error">{error}</Alert>

        {loading ? (
          <div className="stat-grid" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="card stat-card" key={index}>
                <div className="skeleton" style={{ width: '5rem', height: '2.2rem' }} />
                <div className="skeleton" style={{ width: '7.5rem', height: '1rem' }} />
              </div>
            ))}
          </div>
        ) : analytics.totalInterviews === 0 ? (
          <section className="card empty-state">
            <BarChart3 size={32} />
            <h3>Nothing to analyze yet</h3>
            <p>Complete a couple of practice interviews and your trends and breakdowns will show up here.</p>
            <Link className="btn btn-primary btn-auto" to="/interview/setup">Start your first interview</Link>
          </section>
        ) : (
          <>
            <div className="stat-grid">
              <div className="card stat-card">
                <div className="stat-value">{analytics.overallAverage !== null ? `${analytics.overallAverage}/10` : '—'}</div>
                <div className="stat-label">Overall average</div>
                <TrendPill trend={analytics.trend} />
              </div>
              <div className="card stat-card">
                <div className="stat-value">{analytics.totalInterviews}</div>
                <div className="stat-label">Interviews completed</div>
              </div>
              <div className="card stat-card">
                <div className="stat-value">{analytics.totalQuestions}</div>
                <div className="stat-label">Questions answered</div>
              </div>
              <div className="card stat-card">
                <div className="stat-value">{analytics.consistencyLabel || '—'}</div>
                <div className="stat-label">Consistency{analytics.consistency !== null ? ` (±${analytics.consistency})` : ''}</div>
              </div>
            </div>

            {analytics.scoreOverTime.length > 1 && (
              <section className="card">
                <div className="section-heading">
                  <h2>Score over time</h2>
                </div>
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <ScoreTrend scores={analytics.scoreOverTime.map((point) => point.score)} />
                  <p className="text-subtle" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                    Every completed interview, oldest to most recent (left to right)
                  </p>
                </div>
              </section>
            )}

            <div className="analytics-grid">
              {questionTypeRows.length > 0 && (
                <section className="card">
                  <h2>By question type</h2>
                  <p className="text-subtle" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                    Averaged across every individual question you've answered, not just whole interviews.
                  </p>
                  <div style={{ marginTop: 'var(--space-5)' }}>
                    {questionTypeRows.map((row) => (
                      <ScoreBreakdownBar key={row.label} label={row.label} average={row.average} count={row.count} />
                    ))}
                  </div>
                </section>
              )}

              {difficultyRows.length > 0 && (
                <section className="card">
                  <h2>By difficulty</h2>
                  <p className="text-subtle" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                    How you score at each difficulty level you've practiced.
                  </p>
                  <div style={{ marginTop: 'var(--space-5)' }}>
                    {difficultyRows.map((row) => (
                      <ScoreBreakdownBar key={row.label} label={row.label} average={row.average} count={row.count} />
                    ))}
                  </div>
                </section>
              )}

              {analytics.byRole.length > 0 && (
                <section className="card">
                  <h2>By role</h2>
                  <p className="text-subtle" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                    Your most-practiced roles, ranked by how often you've interviewed for them.
                  </p>
                  <div style={{ marginTop: 'var(--space-5)' }}>
                    {analytics.byRole.slice(0, 6).map((row) => (
                      <ScoreBreakdownBar key={row.key} label={row.key} average={row.average} count={row.count} countLabel="interviews" />
                    ))}
                  </div>
                </section>
              )}

              {analytics.bySkill.length > 0 && (
                <section className="card">
                  <h2>By skill</h2>
                  <p className="text-subtle" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                    Average score across interviews where you added this skill at setup.
                  </p>
                  <div style={{ marginTop: 'var(--space-5)' }}>
                    {analytics.bySkill.slice(0, 6).map((row) => (
                      <ScoreBreakdownBar key={row.key} label={row.key} average={row.average} count={row.count} countLabel="interviews" />
                    ))}
                  </div>
                </section>
              )}

              {analytics.byMode.length > 1 && (
                <section className="card">
                  <h2>Adaptive vs. fixed</h2>
                  <p className="text-subtle" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                    Whether one interview style tends to score differently for you.
                  </p>
                  <div style={{ marginTop: 'var(--space-5)' }}>
                    {analytics.byMode.map((row) => (
                      <ScoreBreakdownBar key={row.key} label={row.key} average={row.average} count={row.count} countLabel="interviews" />
                    ))}
                  </div>
                </section>
              )}

              {analytics.byResumeUsage.length > 1 && (
                <section className="card">
                  <h2>Resume-tailored vs. standard</h2>
                  <p className="text-subtle" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                    Whether uploading a resume changed how you scored.
                  </p>
                  <div style={{ marginTop: 'var(--space-5)' }}>
                    {analytics.byResumeUsage.map((row) => (
                      <ScoreBreakdownBar key={row.key} label={row.key} average={row.average} count={row.count} countLabel="interviews" />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AnalyticsPage;
