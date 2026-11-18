import { Link } from 'react-router-dom';
import { Sparkles, PlayCircle, ListChecks, Trophy, TrendingUp, Star } from 'lucide-react';
import AppHeader from '../components/AppHeader.jsx';
import PageBackground from '../layouts/PageBackground.jsx';
import Alert from '../components/Alert.jsx';
import ScoreTrend from '../components/ScoreTrend.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUserInterviews, computeInterviewStats } from '../hooks/useUserInterviews.js';

function DashboardPage() {
  const { user } = useAuth();
  const { interviews, loading, error } = useUserInterviews();
  const stats = computeInterviewStats(interviews);
  const trendScores = stats.recent.map((interview) => interview.overallScore).reverse();

  return (
    <div className="app-shell">
      <PageBackground />
      <AppHeader active="dashboard" />

      <main className="app-main">
        <div className="page-header">
          <div className="page-title-group">
            <p className="eyebrow"><Sparkles size={13} /> Dashboard</p>
            <h1>Welcome back</h1>
            <p>Signed in as <strong>{user.email}</strong></p>
          </div>
          <Link className="btn btn-primary btn-auto" to="/interview/setup">
            <PlayCircle size={17} /> Start new interview
          </Link>
        </div>

        <Alert variant="error">{error}</Alert>

        {loading ? (
          <div className="stat-grid" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="card stat-card" key={index}>
                <div className="skeleton" style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-md)' }} />
                <div className="skeleton" style={{ width: '3.5rem', height: '1.6rem' }} />
                <div className="skeleton" style={{ width: '6rem', height: '0.9rem' }} />
              </div>
            ))}
          </div>
        ) : stats.total === 0 ? (
          <section className="card empty-state">
            <Sparkles size={32} />
            <h3>No interview history yet</h3>
            <p>Complete your first practice interview to start tracking your scores and progress here.</p>
            <Link className="btn btn-primary btn-auto" to="/interview/setup">Start your first interview</Link>
          </section>
        ) : (
          <>
            <div className="stat-grid">
              <div className="card stat-card">
                <span className="stat-icon"><ListChecks size={19} /></span>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Interviews completed</div>
              </div>
              <div className="card stat-card">
                <span className="stat-icon"><TrendingUp size={19} /></span>
                <div className="stat-value">{stats.averageScore}/10</div>
                <div className="stat-label">Average score</div>
              </div>
              <div className="card stat-card">
                <span className="stat-icon"><Trophy size={19} /></span>
                <div className="stat-value">{stats.bestScore}/10</div>
                <div className="stat-label">Best score</div>
              </div>
              <div className="card stat-card">
                <span className="stat-icon"><Star size={19} /></span>
                <div className="stat-value">{stats.latestScore}/10</div>
                <div className="stat-label">Most recent score</div>
              </div>
            </div>

            <section className="card">
              <div className="section-heading">
                <h2>Recent interviews</h2>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Link to="/analytics" className="btn btn-ghost btn-auto btn-sm">View analytics</Link>
                  <Link to="/history" className="btn btn-ghost btn-auto btn-sm">View all</Link>
                </div>
              </div>
              {trendScores.length > 1 && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <ScoreTrend scores={trendScores} />
                  <p className="text-subtle" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>Score trend across your last {trendScores.length} interviews</p>
                </div>
              )}
              <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
                {stats.recent.map((interview) => (
                  <div className="list-row" key={interview.id}>
                    <div className="list-row-main">
                      <span className="list-row-title">{interview.role}</span>
                      <span className="list-row-meta">
                        <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{interview.difficulty}</span>
                        <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{interview.interviewType}</span>
                        <span>{interview.questionCount} questions</span>
                        {interview.createdAt && <span>{interview.createdAt.toLocaleDateString()}</span>}
                      </span>
                    </div>
                    <div className="list-row-score">
                      <strong>{interview.overallScore}/10</strong>
                      <span>score</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default DashboardPage;
