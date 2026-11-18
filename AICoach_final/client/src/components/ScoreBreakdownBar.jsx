function ScoreBreakdownBar({ label, average, count, countLabel = 'questions' }) {
  const widthPercent = average === null ? 0 : Math.max(4, (average / 10) * 100);

  return (
    <div className="breakdown-row">
      <div className="breakdown-row-header">
        <span className="breakdown-row-label">{label}</span>
        <span className="breakdown-row-value">
          {average === null ? '—' : `${average}/10`}
          <span className="text-subtle" style={{ fontWeight: 500 }}> · {count} {countLabel}</span>
        </span>
      </div>
      <div className="progress-track" style={{ margin: 'var(--space-2) 0 0' }} aria-label={`${label}: ${average === null ? 'no data' : `${average} out of 10`}`}>
        <div className="progress-value" style={{ width: `${widthPercent}%` }} />
      </div>
    </div>
  );
}

export default ScoreBreakdownBar;
