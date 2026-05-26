// Web Speech API dictation hook. No API keys, no network — runs in the
// browser. Gracefully no-ops where unsupported (Firefox, some mobile).

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number } }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function voiceSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export interface DictationOptions {
  lang?: string;
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
}

export function useDictation({ lang = "en-US", onFinal, onInterim }: DictationOptions) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const start = useCallback(() => {
    setError(null);
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Voice input not supported on this device.");
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < e.results.length; i++) {
          const alt = e.results[i][0];
          const isFinal = (e.results[i] as unknown as { isFinal?: boolean }).isFinal;
          if (isFinal) final += alt.transcript;
          else interim += alt.transcript;
        }
        if (interim && onInterim) onInterim(interim);
        if (final) onFinal(final.trim());
      };
      rec.onerror = (e) => {
        setError(e.error === "not-allowed" ? "Microphone permission denied." : `Voice error: ${e.error}`);
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch (e) {
      setError((e as Error).message);
      setListening(false);
    }
  }, [lang, onFinal, onInterim]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  useEffect(() => () => { recRef.current?.abort(); }, []);

  return { listening, error, start, stop, supported: voiceSupported() };
}
