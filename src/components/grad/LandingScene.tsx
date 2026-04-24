import { GraduationCap, Map, Footprints, Sparkles, ArrowRight } from "lucide-react";
import { useSfx } from "./AudioProvider";

interface LandingSceneProps { onStart: () => void }

const STEPS = [
  { n: 1, icon: Map,       label: "Maze",    sub: "Find your way",    color: "#3b82f6", bg: "#eff6ff" },
  { n: 2, icon: Footprints,label: "Run",     sub: "Collect credits",  color: "#d4922a", bg: "#fff8e6" },
  { n: 3, icon: Sparkles,  label: "Slice",   sub: "Cut through it",   color: "#8b5cf6", bg: "#f5f3ff" },
];

export function LandingScene({ onStart }: LandingSceneProps) {
  const { play } = useSfx();
  return (
    <section className="page-bg dots-bg" style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 16px 40px" }}>
      <div style={{ width:"100%", maxWidth:440, display:"flex", flexDirection:"column", gap:24 }}>

        {/* Badge */}
        <div className="animate-fade-in" style={{ display:"flex", justifyContent:"center" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 14px 6px 8px", background:"var(--gold-bg)", border:"1.5px solid var(--gold-border)", borderRadius:999 }}>
            <div style={{ width:26, height:26, borderRadius:"50%", background:"var(--gold)", display:"grid", placeItems:"center", boxShadow:"0 2px 6px rgb(212 146 42/0.4)" }}>
              <GraduationCap size={14} color="#fff" />
            </div>
            <span style={{ fontSize:"0.63rem", fontWeight:800, letterSpacing:"0.18em", textTransform:"uppercase", color:"var(--gold)" }}>
              You're Invited
            </span>
          </div>
        </div>

        {/* Headline */}
        <div className="animate-slide-up" style={{ textAlign:"center", animationDelay:"0.07s" }}>
          <h1 className="display" style={{ fontSize:"clamp(2.6rem,9vw,3.8rem)", color:"var(--ink)" }}>
            Graduation
          </h1>
          <h1 className="display-italic" style={{ fontSize:"clamp(2.6rem,9vw,3.8rem)", color:"var(--gold)" }}>
            Unlock
          </h1>
          <p style={{ marginTop:12, fontSize:"0.92rem", color:"var(--ink-3)", lineHeight:1.65 }}>
            Beat three mini-games to reveal<br />an exclusive graduation invitation.
          </p>
        </div>

        {/* Challenge cards */}
        <div className="animate-slide-up" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, animationDelay:"0.14s" }}>
          {STEPS.map(({ n, icon: Icon, label, sub, color, bg }) => (
            <div key={n} style={{ background:bg, border:`1.5px solid ${color}30`, borderRadius:18, padding:"16px 10px", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:`${color}18`, border:`1.5px solid ${color}35`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:"0.58rem", fontWeight:800, letterSpacing:"0.16em", textTransform:"uppercase", color, marginBottom:2 }}>0{n}</div>
                <div style={{ fontSize:"0.8rem", fontWeight:800, color:"var(--ink)" }}>{label}</div>
                <div style={{ fontSize:"0.65rem", color:"var(--ink-3)", marginTop:2 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="animate-slide-up" style={{ animationDelay:"0.21s" }}>
          <button
            className="btn-primary"
            style={{ width:"100%", fontSize:"1.05rem", borderRadius:999, padding:"16px 32px", animation:"breathe 2.5s ease-in-out infinite" }}
            onClick={() => { play("swoosh"); onStart(); }}
          >
            Begin the Journey <ArrowRight size={18} />
          </button>
          <p style={{ textAlign:"center", marginTop:12, fontSize:"0.7rem", color:"var(--ink-4)" }}>
            3 mini-games
          </p>
        </div>
      </div>
    </section>
  );
}
