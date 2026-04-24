import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "grad-invite-sound";

type Tone = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  vol?: number;
  attack?: number;
  release?: number;
};

export type SfxName =
  | "click"
  | "swoosh"
  | "step"
  | "coin"
  | "gold"
  | "slice"
  | "combo"
  | "win"
  | "unlock"
  | "confetti";

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "1";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  }, [enabled]);

  const ensureCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playTone = useCallback(
    (tones: Tone[]) => {
      if (!enabled) return;
      const ctx = ensureCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      tones.forEach((t, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = t.type ?? "sine";
        osc.frequency.setValueAtTime(t.freq, now + i * 0.04);
        const vol = t.vol ?? 0.12;
        const attack = t.attack ?? 0.005;
        const release = t.release ?? 0.08;
        gain.gain.setValueAtTime(0, now + i * 0.04);
        gain.gain.linearRampToValueAtTime(vol, now + i * 0.04 + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + t.duration + release);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + t.duration + release + 0.02);
      });
    },
    [enabled, ensureCtx],
  );

  const play = useCallback(
    (name: SfxName) => {
      switch (name) {
        case "click":
          return playTone([{ freq: 720, duration: 0.05, type: "triangle", vol: 0.08 }]);
        case "swoosh":
          return playTone([
            { freq: 380, duration: 0.08, type: "sine", vol: 0.07 },
            { freq: 220, duration: 0.1, type: "sine", vol: 0.06 },
          ]);
        case "step":
          return playTone([{ freq: 520, duration: 0.04, type: "triangle", vol: 0.05 }]);
        case "coin":
          return playTone([
            { freq: 880, duration: 0.06, type: "triangle", vol: 0.09 },
            { freq: 1320, duration: 0.08, type: "triangle", vol: 0.08 },
          ]);
        case "gold":
          return playTone([
            { freq: 988, duration: 0.08, type: "triangle", vol: 0.1 },
            { freq: 1318, duration: 0.1, type: "triangle", vol: 0.09 },
            { freq: 1760, duration: 0.12, type: "sine", vol: 0.08 },
          ]);
        case "slice":
          return playTone([
            { freq: 1200, duration: 0.04, type: "sawtooth", vol: 0.05 },
            { freq: 600, duration: 0.06, type: "sine", vol: 0.06 },
          ]);
        case "combo":
          return playTone([
            { freq: 660, duration: 0.07, type: "triangle", vol: 0.08 },
            { freq: 880, duration: 0.07, type: "triangle", vol: 0.08 },
            { freq: 1320, duration: 0.1, type: "triangle", vol: 0.09 },
          ]);
        case "win":
          return playTone([
            { freq: 523, duration: 0.12, type: "triangle", vol: 0.1 },
            { freq: 659, duration: 0.12, type: "triangle", vol: 0.1 },
            { freq: 784, duration: 0.18, type: "triangle", vol: 0.1 },
            { freq: 1046, duration: 0.28, type: "sine", vol: 0.1 },
          ]);
        case "unlock":
          return playTone([
            { freq: 392, duration: 0.14, type: "sine", vol: 0.1 },
            { freq: 523, duration: 0.14, type: "sine", vol: 0.1 },
            { freq: 659, duration: 0.18, type: "sine", vol: 0.1 },
            { freq: 880, duration: 0.22, type: "triangle", vol: 0.11 },
            { freq: 1318, duration: 0.4, type: "sine", vol: 0.1 },
          ]);
        case "confetti":
          return playTone([
            { freq: 1500, duration: 0.05, type: "triangle", vol: 0.07 },
            { freq: 1900, duration: 0.05, type: "triangle", vol: 0.06 },
          ]);
      }
    },
    [playTone],
  );

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  return { enabled, toggle, play };
}
