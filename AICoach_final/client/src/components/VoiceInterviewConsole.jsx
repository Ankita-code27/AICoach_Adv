import { useEffect, useRef, useState } from 'react';
import { Mic, Square, RotateCcw, Send, Edit3, Check, AlertCircle } from 'lucide-react';
import Alert from './Alert.jsx';
import useSpeechRecognition from '../hooks/useSpeechRecognition.js';

function VoiceInterviewConsole({
  value,
  onChange,
  onSubmit,
  submitting,
  disabled,
  error: submitError,
}) {
  const {
    isSupported,
    isListening,
    transcript,
    error: speechError,
    start,
    stop,
    reset,
  } = useSpeechRecognition();

  const [isEditing, setIsEditing] = useState(false);
  const baseTextRef = useRef('');

  // Sync speech-to-text transcript into the answer state
  useEffect(() => {
    if (!isListening || !transcript) return;
    const separator = baseTextRef.current && !baseTextRef.current.endsWith(' ') ? ' ' : '';
    onChange(`${baseTextRef.current}${separator}${transcript}`);
  }, [transcript, isListening, onChange]);

  function handleStartListening() {
    if (disabled || submitting) return;
    setIsEditing(false);
    baseTextRef.current = value ? `${value.trim()} ` : '';
    reset();
    start();
  }

  function handleStopListening() {
    stop();
  }

  function handleRerecord() {
    if (disabled || submitting) return;
    stop();
    reset();
    baseTextRef.current = '';
    onChange('');
    setIsEditing(false);
    start();
  }

  function handleToggleManualEdit() {
    if (isListening) stop();
    setIsEditing((prev) => !prev);
  }

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;
  const hasAnswer = Boolean(value.trim());

  if (!isSupported) {
    return (
      <div className="voice-console voice-unsupported">
        <AlertCircle size={32} className="text-warning" />
        <h3>Voice input not supported in this browser</h3>
        <p className="text-muted">
          Your current browser does not support the Web Speech API. For the best voice interview
          experience, please use Google Chrome, Microsoft Edge, or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="voice-console">
      {/* Voice Status Header */}
      <div className="voice-status-bar">
        <div className="voice-status-pill">
          {isListening ? (
            <>
              <span className="voice-pulse-dot" aria-hidden="true" />
              <span className="voice-status-text active">Listening... speak your answer now</span>
            </>
          ) : hasAnswer ? (
            <>
              <span className="voice-status-dot ready" aria-hidden="true" />
              <span className="voice-status-text">Speech captured — review or submit below</span>
            </>
          ) : (
            <>
              <span className="voice-status-dot" aria-hidden="true" />
              <span className="voice-status-text">Microphone ready — click below to begin speaking</span>
            </>
          )}
        </div>
      </div>

      {/* Main Microphone Interaction Zone */}
      <div className="voice-mic-zone">
        <div className={`voice-mic-wrapper ${isListening ? 'is-active' : ''}`}>
          {isListening && (
            <>
              <span className="voice-pulse-ring ring-1" aria-hidden="true" />
              <span className="voice-pulse-ring ring-2" aria-hidden="true" />
            </>
          )}
          <button
            type="button"
            className={`voice-mic-btn ${isListening ? 'recording' : ''}`}
            onClick={isListening ? handleStopListening : handleStartListening}
            disabled={disabled || submitting}
            aria-label={isListening ? 'Stop recording answer' : 'Start recording answer'}
            title={isListening ? 'Stop recording' : 'Start speaking'}
          >
            {isListening ? <Square size={26} /> : <Mic size={28} />}
          </button>
        </div>

        <div className="voice-mic-caption">
          {isListening ? (
            <>
              <strong>Recording in progress</strong>
              <div className="voice-waveform" aria-hidden="true">
                <span className="wave-bar" />
                <span className="wave-bar" />
                <span className="wave-bar" />
                <span className="wave-bar" />
                <span className="wave-bar" />
              </div>
              <span className="voice-hint">Click the square to finish recording</span>
            </>
          ) : hasAnswer ? (
            <span className="voice-hint">Click to speak more or re-record below</span>
          ) : (
            <span className="voice-hint">Click the microphone to start speaking your response</span>
          )}
        </div>
      </div>

      {/* Transcribed Answer Panel */}
      <div className="voice-transcript-section">
        <div className="voice-transcript-header">
          <label htmlFor="voice-transcript-input" className="voice-transcript-label">
            Transcribed Answer
          </label>
          {hasAnswer && (
            <div className="voice-transcript-meta">
              <span className="voice-word-counter">
                {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-auto btn-sm"
                onClick={handleToggleManualEdit}
                disabled={disabled || submitting}
                title="Edit transcription text"
              >
                {isEditing ? <Check size={14} /> : <Edit3 size={14} />}
                {isEditing ? 'Done editing' : 'Edit text'}
              </button>
            </div>
          )}
        </div>

        <div className={`voice-transcript-display ${isListening ? 'is-listening' : ''}`}>
          {isEditing ? (
            <textarea
              id="voice-transcript-input"
              className="textarea voice-manual-textarea"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your answer will appear here..."
              rows={5}
              disabled={submitting}
            />
          ) : hasAnswer ? (
            <div className="voice-live-text">
              <p>{value}</p>
              {isListening && <span className="voice-cursor" aria-hidden="true" />}
            </div>
          ) : (
            <div className="voice-empty-placeholder">
              <p>Your spoken answer will appear here in real time as you speak...</p>
            </div>
          )}
        </div>
      </div>

      {/* Error alerts */}
      {speechError && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Alert variant="error">{speechError}</Alert>
        </div>
      )}
      {submitError && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Alert variant="error">{submitError}</Alert>
        </div>
      )}

      {/* Voice Bottom Action Bar */}
      <div className="voice-action-bar">
        {hasAnswer && (
          <button
            type="button"
            className="btn btn-secondary btn-auto"
            onClick={handleRerecord}
            disabled={disabled || submitting}
          >
            <RotateCcw size={16} /> Re-record answer
          </button>
        )}

        <button
          type="button"
          className="btn btn-primary btn-auto voice-submit-btn"
          onClick={onSubmit}
          disabled={!hasAnswer || submitting || isListening}
        >
          {submitting ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              Evaluating your spoken answer...
            </>
          ) : (
            <>
              <Send size={16} />
              Confirm & Submit Answer
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default VoiceInterviewConsole;
