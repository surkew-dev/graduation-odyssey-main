import { useCallback, useEffect, useState } from "react";
import { AudioProvider } from "@/components/grad/AudioProvider";
import { Hud } from "@/components/grad/Hud";
import { LandingScene } from "@/components/grad/LandingScene";
import { MazeGame } from "@/components/grad/MazeGame";
import { RunnerGame } from "@/components/grad/RunnerGame";
import { SliceGame } from "@/components/grad/SliceGame";
import { Interlude } from "@/components/grad/Interlude";
import { UnlockScene } from "@/components/grad/UnlockScene";
import { ParticleField } from "@/components/grad/ParticleField";
import type { Scene } from "@/components/grad/scenes";

const Index = () => {
  const [scene, setScene] = useState<Scene>("landing");

  useEffect(() => {
    document.title = "You're Invited · Graduation Unlock";
    const desc = "Beat 3 mini games to unlock an elegant graduation invitation — a premium interactive celebration.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, []);

  const go = useCallback((next: Scene) => setScene(next), []);

  const goMaze = useCallback(() => go("maze"), [go]);
  const goInterlude2 = useCallback(() => go("interlude-2"), [go]);
  const goRunner = useCallback(() => go("runner"), [go]);
  const goInterlude3 = useCallback(() => go("interlude-3"), [go]);
  const goSlice = useCallback(() => go("slice"), [go]);
  const goUnlock = useCallback(() => go("unlock"), [go]);
  const goLanding = useCallback(() => go("landing"), [go]);

  return (
    <AudioProvider>
      <main style={{ position:"relative", minHeight:"100dvh", width:"100%", overflow:"hidden" }}>
        <ParticleField count={14} />

        <Hud scene={scene} />

        {scene === "landing" && <LandingScene onStart={goMaze} />}
        {scene === "maze" && <MazeGame onComplete={goInterlude2} />}
        {scene === "interlude-2" && (
          <Interlude
            step={2}
            title="Campus Run"
            subtitle="Race through campus and collect 50 credits"
            onContinue={goRunner}
          />
        )}
        {scene === "runner" && <RunnerGame onComplete={goInterlude3} />}
        {scene === "interlude-3" && (
          <Interlude
            step={3}
            title="Slice Rush"
            subtitle="Slice the symbols of your graduation"
            onContinue={goSlice}
          />
        )}
        {scene === "slice" && <SliceGame onComplete={goUnlock} />}
        {scene === "unlock" && <UnlockScene onReplay={goLanding} />}
      </main>
    </AudioProvider>
  );
};

export default Index;
