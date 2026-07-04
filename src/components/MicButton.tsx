"use client";

import { useEffect, useRef, useState } from "react";

// Minimal shape of the (webkit-prefixed) Web Speech API.
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Drop-in dictation button for any controlled text field: pass the field's
 * `value` + `onChange` and it appends spoken words live. Renders nothing on
 * browsers without the Web Speech API, so it's safe to sprinkle everywhere.
 */
export function MicButton({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef("");

  useEffect(() => {
    setSupported(getSpeechRecognition() !== null);
    return () => recRef.current?.stop();
  }, []);

  if (!supported) return null;

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR = getSpeechRecognition();
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    baseRef.current = value ? value.replace(/\s+$/, "") + " " : "";
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r && r[0]) transcript += r[0].transcript;
      }
      onChange(baseRef.current + transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? "Stop dictation" : "Dictate"}
      aria-pressed={listening}
      title={listening ? "Stop" : "Dictate"}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm transition-colors ${
        listening
          ? "animate-pulse border-fitness bg-fitness text-white"
          : "border-line text-muted hover:border-accent hover:text-accent"
      } ${className}`}
    >
      🎤
    </button>
  );
}
