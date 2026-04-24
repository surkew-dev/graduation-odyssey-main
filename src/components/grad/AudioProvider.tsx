import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAudio } from "@/hooks/useAudio";

type AudioCtx = ReturnType<typeof useAudio>;

const Ctx = createContext<AudioCtx | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audio = useAudio();
  const value = useMemo(() => audio, [audio]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSfx() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSfx must be used within AudioProvider");
  return v;
}
