import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronDown, ChevronUp, History as HistoryIcon, Search, SlidersHorizontal } from 'lucide-react';
import AppHeader from '../components/AppHeader.jsx';
import PageBackground from '../layouts/PageBackground.jsx';
import Alert from '../components/Alert.jsx';
import { useUserInterviews } from '../hooks/useUserInterviews.js';

const difficultyFilters = [
  { value: 'all', label: 'All difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const typeFilters = [
  { value: 'all', label: 'All types' },
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'coding', label: 'Coding' },
  { value: 'mixed', label: 'Mixed' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest score' },
  { value: 'lowest', label: 'Lowest score' },
];

function filterAndSortInterviews(interviews, { searchTerm, difficulty, interviewType, sortBy }) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filtered = interviews.filter((interview) => {
    const matchesSearch = !normalizedSearch || interview.role.toLowerCase().includes(normalizedSearch);
    const matchesDifficulty = difficulty === 'all' || interview.difficulty === difficulty;
    const matchesType = interviewType === 'all' || interview.interviewType === interviewType;
    return matchesSearch && matchesDifficulty && matchesType;
  });

  const sorted = [...filtered];
  if (sortBy === 'oldest') {
    sorted.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
  } else if (sortBy === 'highest') {
    sorted.sort((a, b) => b.overallScore - a.overallScore);
  } else if (sortBy === 'lowest') {
    sorted.sort((a, b) => a.overallScore - b.overallScore);
  }
  // 'newest' relies on the hook's default order (already newest-first).

  return sorted;
}

function HistoryPage() {
  const { interviews, loading, error } = useUserInterviews();
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [interviewType, setInterviewType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const visibleInterviews = useMemo(
    () => (interviews ? filterAndSortInterviews(interviews, { searchTerm, difficulty, interviewType, sortBy }) : []),
    [interviews, searchTerm, difficulty, interviewType, sortBy],
  );

  const hasAnyInterviews = Boolean(interviews?.length);
  const hasFiltersApplied = searchTerm.trim() !== '' || difficulty !== 'all' || interviewType !== 'all';

  return (
    <div className="app-shell">
      <PageBackground />
      <AppHeader active="history" />

      <main className="app-main">
        <div className="page-header">
          <div className="page-title-group">
            <p className="eyebrow"><HistoryIcon size={13} /> Interview history</p>
            <h1>Your past interviews</h1>
            <p>Review previous sessions, scores, and AI feedback.</p>
          </div>
        </div>

        <Alert variant="error">{error}</Alert>

        {hasAnyInterviews && (
          <section className="card card-flat history-filters">
            <div className="input-with-icon">
              <span className="field-icon" aria-hidden="true"><Search size={17} /></span>
              <input
                type="search"
                className="input"
                placeholder="Search by role (e.g. Frontend Developer)"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="Search interviews by role"
              />
            </div>

            <div className="history-filter-row">
              <div className="tag-grid" role="group" aria-label="Filter by difficulty">
                {difficultyFilters.map((option) => (
                  <label key={option.value} className={`tag-chip ${difficulty === option.value ? 'selected' : ''}`}>
                    <input type="radio" name="difficulty-filter" value={option.value} checked={difficulty === option.value} onChange={() => setDifficulty(option.value)} />
                    {option.label}
                  </label>
                ))}
              </div>

              <div className="tag-grid" role="group" aria-label="Filter by interview type">
                {typeFilters.map((option) => (
                  <label key={option.value} className={`tag-chip ${interviewType === option.value ? 'selected' : ''}`}>
                    <input type="radio" name="type-filter" value={option.value} checked={interviewType === option.value} onChange={() => setInterviewType(option.value)} />
                    {option.label}
                  </label>
                ))}
              </div>

              <div className="history-sort">
                <SlidersHorizontal size={15} className="text-subtle" />
                <select className="select" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort interviews">
                  {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }} aria-hidden="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="skeleton" style={{ height: '4.5rem', borderRadius: 'var(--radius-md)' }} key={index} />
            ))}
          </div>
        ) : !hasAnyInterviews ? (
          <section className="card empty-state">
            <Sparkles size={32} />
            <h3>No interviews yet</h3>
            <p>Your completed practice interviews will show up here.</p>
            <Link className="btn btn-primary btn-auto" to="/interview/setup">Start an interview</Link>
          </section>
        ) : !visibleInterviews.length ? (
          <section className="card empty-state">
            <Search size={32} />
            <h3>No interviews match your filters</h3>
            <p>Try a different search term or clear the difficulty filter.</p>
            {hasFiltersApplied && (
              <button type="button" className="btn btn-secondary btn-auto" onClick={() => { setSearchTerm(''); setDifficulty('all'); setInterviewType('all'); }}>
                Clear filters
              </button>
            )}
          </section>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <p className="text-subtle" style={{ fontSize: 'var(--text-sm)' }}>
              Showing {visibleInterviews.length} of {interviews.length} interview{interviews.length === 1 ? '' : 's'}
            </p>
            {visibleInterviews.map((interview) => {
              const expanded = expandedId === interview.id;
              return (
                <section className="card" key={interview.id}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: 0, justifyContent: 'space-between', width: '100%' }}
                    onClick={() => setExpandedId(expanded ? null : interview.id)}
                    aria-expanded={expanded}
                  >
                    <div className="list-row-main" style={{ textAlign: 'left' }}>
                      <span className="list-row-title">{interview.role}</span>
                      <span className="list-row-meta">
                        <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{interview.difficulty}</span>
                        <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{interview.interviewType}</span>
                        {interview.mode === 'adaptive' && <span className="badge badge-success">Adaptive</span>}
                        {interview.resumeUsed && <span className="badge badge-warning">Resume-tailored</span>}
                        <span className="badge badge-neutral">
                          {interview.method === 'voice' || interview.voiceMode ? 'Voice' : 'Written'}
                        </span>
                        <span>{interview.questionCount} questions</span>
                        {interview.createdAt && <span>{interview.createdAt.toLocaleDateString()}</span>}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <strong className="score-badge">{interview.overallScore}/10</strong>
                      {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {expanded && (
                    <div style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
                      {interview.responses.map((response) => (
                        <div className="card card-muted" key={response.questionId}>
                          <p className="question-type">{response.type}</p>
                          <h3>{response.question}</h3>
                          {response.type === 'coding' ? (
                            <pre className="text-muted" style={{ marginTop: 'var(--space-2)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                              <strong>Your solution ({response.language}):</strong>{'\n'}{response.answer}
                            </pre>
                          ) : (
                            <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}><strong>Your answer: </strong>{response.answer}</p>
                          )}
                          <div className="evaluation-heading" style={{ marginTop: 'var(--space-3)' }}>
                            <h3>Feedback</h3>
                            <strong className="score-badge">{response.evaluation.score}/10</strong>
                          </div>
                          <p className="text-muted">{response.evaluation.feedback}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default HistoryPage;
