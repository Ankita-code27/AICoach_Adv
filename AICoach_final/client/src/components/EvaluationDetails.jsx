import { CheckCircle2, AlertTriangle, Lightbulb, Gauge, Code2 } from 'lucide-react';

function EvaluationList({ title, items, variant, icon: Icon, ordered = false }) {
  if (!items?.length) return null;
  const List = ordered ? 'ol' : 'ul';
  return (
    <div className={`evaluation-section ${variant || ''}`}>
      <h3>{Icon ? <Icon size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.4rem' }} /> : null}{title}</h3>
      <List>{items.map((item) => <li key={item}>{item}</li>)}</List>
    </div>
  );
}

function EvaluationDetails({ evaluation, showScore = true }) {
  if (!evaluation) return null;

  return (
    <>
      {showScore && (
        <div className="evaluation-heading">
          <h2>Answer evaluation</h2>
          <strong className="score-badge">{evaluation.score}/10</strong>
        </div>
      )}
      {/* correctnessNotes/complexityNotes are only present on coding-question evaluations
          (see evaluateCodeAnswer in groq.service.js) - absent for prose answers. */}
      {evaluation.correctnessNotes && (
        <div className="evaluation-section">
          <h3><Code2 size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.4rem' }} />Correctness (AI-reviewed, not executed)</h3>
          <p>{evaluation.correctnessNotes}</p>
        </div>
      )}
      {evaluation.complexityNotes && (
        <div className="evaluation-section">
          <h3><Gauge size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.4rem' }} />Time & space complexity</h3>
          <p>{evaluation.complexityNotes}</p>
        </div>
      )}
      <EvaluationList title="Strengths" items={evaluation.strengths} variant="strength" icon={CheckCircle2} />
      <EvaluationList title="Areas to improve" items={evaluation.weaknesses} variant="improvement" icon={AlertTriangle} />
      <div className="evaluation-section"><h3>AI feedback</h3><p>{evaluation.feedback}</p></div>
      <EvaluationList title="How to improve" items={evaluation.suggestions} ordered icon={Lightbulb} />
      <div className="evaluation-section sample-answer"><h3>{evaluation.correctnessNotes ? 'Reference solution' : 'Sample better answer'}</h3><p style={evaluation.correctnessNotes ? { fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' } : undefined}>{evaluation.sampleAnswer}</p></div>
    </>
  );
}

export default EvaluationDetails;
