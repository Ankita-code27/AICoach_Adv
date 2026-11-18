import { useCallback, useEffect, useRef, useState } from 'react';

// Web Speech API's SpeechRecognition is non-standard: reliable in Chrome/Edge, partial in
// Safari, absent in Firefox. Every caller of this hook MUST check `isSupported` and offer a
// typed-answer fallback - voice is an enhancement here, never the only way to answer.
function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

// Interim results stream in as the user talks; `transcript` always reflects "everything said
// so far in this listening session" so the caller can show a live preview. The caller decides
// when to stop listening and commit the transcript into an editable field - we never auto-submit.
function useSpeechRecognition({ lang = 'en-US' } = {}) {
  const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();
  const isSupported = Boolean(SpeechRecognitionConstructor);

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const start = useCallback(() => {
    if (!isSupported || isListening) return;

    setError('');
    finalTranscriptRef.current = '';
    setTranscript('');

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += `${result[0].transcript} `;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(`${finalTranscriptRef.current}${interim}`.trim());
    };

    recognition.onerror = (event) => {
      // 'no-speech' and 'aborted' are routine (silence, or the user clicked stop) - not
      // worth surfacing as an error to the user.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(
          event.error === 'not-allowed' || event.error === 'permission-denied'
            ? 'Microphone access was denied. You can still type your answer below.'
            : "We couldn't hear you clearly. Please try again or type your answer.",
        );
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setError("We couldn't start the microphone. Please try again or type your answer.");
    }
  }, [SpeechRecognitionConstructor, isListening, isSupported, lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setError('');
  }, []);

  return { isSupported, isListening, transcript, error, start, stop, reset };
}

export default useSpeechRecognition;
