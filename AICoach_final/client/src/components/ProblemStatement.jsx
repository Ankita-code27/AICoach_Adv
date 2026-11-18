import { ShieldAlert } from 'lucide-react';

function ProblemStatement({ problemSpec }) {
  if (!problemSpec) return null;

  return (
    <div className="problem-spec">
      <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{problemSpec.prompt}</p>

      {problemSpec.constraints?.length > 0 && (
        <div>
          <h3 style={{ fontSize: 'var(--text-sm)', margin: '0 0 var(--space-2)' }}>Constraints</h3>
          <ul className="problem-constraints">
            {problemSpec.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}
          </ul>
        </div>
      )}

      {problemSpec.examples?.length > 0 && (
        <div className="problem-spec-examples">
          <h3 style={{ fontSize: 'var(--text-sm)', margin: 0 }}>Examples</h3>
          {problemSpec.examples.map((example, index) => (
            <div className="problem-example" key={`${example.input}-${index}`}>
              <div><strong>Input:</strong> {example.input}</div>
              <div><strong>Output:</strong> {example.output}</div>
              {example.explanation && <div><strong>Explanation:</strong> {example.explanation}</div>}
            </div>
          ))}
        </div>
      )}

      <span className="code-review-badge">
        <ShieldAlert size={13} /> AI-reviewed, not executed
      </span>
    </div>
  );
}

export default ProblemStatement;
