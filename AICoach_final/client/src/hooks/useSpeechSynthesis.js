import { useCallback, useEffect, useState } from 'react';

function isSpeechSynthesisSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function useSpeechSynthesis() {
  const isSupported = isSpeechSynthesisSupported();
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop any in-progress speech when the component using this hook unmounts (e.g. the user
  // navigates away mid-question) so it doesn't keep talking over the next page.
  useEffect(() => {
    if (!isSupported) return undefined;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  const speak = useCallback(
    (text) => {
      if (!isSupported || !text) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [isSupported],
  );

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { isSupported, isSpeaking, speak, cancel };
}

export default useSpeechSynthesis;
