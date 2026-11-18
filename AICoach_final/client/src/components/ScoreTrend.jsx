function ScoreTrend({ scores }) {
  if (!scores || scores.length < 2) return null;

  const width = 220;
  const height = 56;
  const padding = 6;
  const max = 10;
  const min = 0;

  const points = scores.map((score, index) => {
    const x = padding + (index / (scores.length - 1)) * (width - padding * 2);
    const y = height - padding - ((score - min) / (max - min)) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg className="score-trend" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Score trend across your last ${scores.length} interviews`}>
      <polyline points={points.join(' ')} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => {
        const [x, y] = point.split(',');
        return <circle key={index} cx={x} cy={y} r={index === points.length - 1 ? 4 : 2.5} fill="var(--color-primary)" />;
      })}
    </svg>
  );
}

export default ScoreTrend;
