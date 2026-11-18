import { useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis.js';

// `autoPlay` reads a newly-arrived question aloud once, keyed off `questionId` so it never
// re-fires on unrelated re-renders and never re-reads a question the user has already heard.
function QuestionReader({ questionId, text, autoPlay = false }) {
  const { isSupported, isSpeaking, speak, cancel } = useSpeechSynthesis();
  const lastAutoPlayedId = useRef(null);

  useEffect(() => {
    if (!autoPlay || !isSupported || !text) return;
    if (lastAutoPlayedId.current === questionId) return;
    lastAutoPlayedId.current = questionId;
    speak(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, isSupported, questionId, text]);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      className="btn btn-ghost btn-auto btn-sm"
      onClick={() => (isSpeaking ? cancel() : speak(text))}
      aria-label={isSpeaking ? 'Stop reading question aloud' : 'Read question aloud'}
    >
      {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
      {isSpeaking ? 'Stop' : 'Read aloud'}
    </button>
  );
}

export default QuestionReader;
