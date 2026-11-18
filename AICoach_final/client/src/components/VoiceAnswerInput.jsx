import { useEffect, useRef } from 'react';
import { Mic, Square } from 'lucide-react';
import Alert from './Alert.jsx';
import useSpeechRecognition from '../hooks/useSpeechRecognition.js';

// Voice never auto-submits. Listening only fills the shared `value`/`onChange` textarea state
// (the same one the typed-answer flow already uses) so the user always reviews and can edit
// the transcript - technical vocabulary and names are exactly what speech recognition tends to
// get wrong - before hitting the existing "Submit answer" button.
function VoiceAnswerInput({ value, onChange, disabled }) {
  const { isSupported, isListening, transcript, error, start, stop, reset } = useSpeechRecognition();
  const baseTextRef = useRef('');

  useEffect(() => {
    if (!isListening || !transcript) return;
    const separator = baseTextRef.current && !baseTextRef.current.endsWith(' ') ? ' ' : '';
    onChange(`${baseTextRef.current}${separator}${transcript}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, isListening]);

  function handleToggle() {
    if (isListening) {
      stop();
      return;
    }
    baseTextRef.current = value ? `${value.trim()} ` : '';
    reset();
    start();
  }

  if (!isSupported) {
    return (
      <p className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>
        Voice input isn't supported in this browser. Try Chrome or Edge, or type your answer below.
      </p>
    );
  }

  return (
    <div className="voice-answer-controls">
      <button
        type="button"
        className={`btn btn-auto btn-sm ${isListening ? 'btn-danger' : 'btn-secondary'}`}
        onClick={handleToggle}
        disabled={disabled}
        aria-pressed={isListening}
      >
        {isListening ? <Square size={14} /> : <Mic size={14} />}
        {isListening ? 'Stop recording' : 'Answer with voice'}
      </button>
      {isListening && (
        <span className="voice-listening-indicator" role="status" aria-live="polite">
          <span className="voice-pulse-dot" aria-hidden="true" />
          Listening... review the text below before submitting
        </span>
      )}
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}

export default VoiceAnswerInput;
