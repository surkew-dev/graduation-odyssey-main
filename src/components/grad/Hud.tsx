import { Volume2, VolumeX, GraduationCap } from "lucide-react";
import { useSfx } from "./AudioProvider";
import { progressIndex, type Scene } from "./scenes";

export function Hud({ scene }: { scene: Scene }) {
  const { enabled, toggle, play } = useSfx();
  const completed = progressIndex(scene);
  const showProgress = scene !== "landing" && scene !== "unlock";

  return (
    <header style={{ position:"fixed", top:12, left:12, right:12, zIndex:40, display:"flex", justifyContent:"center", pointerEvents:"none" }}>
      <div style={{
        pointerEvents:"auto", width:"100%", maxWidth:480,
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
        padding:"10px 14px",
        background:"rgba(255,253,248,0.92)",
        backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
        border:"1.5px solid var(--border-soft)",
        borderRadius:999,
        boxShadow:"var(--shadow-md)",
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:"var(--gold)", display:"grid", placeItems:"center", boxShadow:"0 2px 6px rgb(212 146 42/0.4)" }}>
            <GraduationCap size={14} color="#fff" />
          </div>
          <span style={{ fontSize:"0.78rem", fontWeight:800, color:"var(--ink)", letterSpacing:"-0.01em" }}>Grad Unlock</span>
        </div>

        {/* Progress pips */}
        {showProgress && (
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {[0,1,2].map(i => (
              <div key={i} className={i < completed ? "pip pip-done" : i === completed ? "pip pip-active" : "pip pip-pending"} />
            ))}
            <span style={{ marginLeft:6, fontSize:"0.68rem", fontWeight:700, color:"var(--ink-3)" }}>{completed}/3</span>
          </div>
        )}

        {/* Sound */}
        <button
          onClick={() => { toggle(); play("click"); }}
          aria-label={enabled ? "Mute" : "Unmute"}
          style={{ width:34, height:34, borderRadius:"50%", background:"var(--bg-muted)", border:"1.5px solid var(--border)", display:"grid", placeItems:"center", color:"var(--ink-3)", cursor:"pointer", transition:"all 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="var(--gold-bg)"; (e.currentTarget as HTMLElement).style.color="var(--gold)"; (e.currentTarget as HTMLElement).style.borderColor="var(--gold-border)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="var(--bg-muted)"; (e.currentTarget as HTMLElement).style.color="var(--ink-3)"; (e.currentTarget as HTMLElement).style.borderColor="var(--border)"; }}
        >
          {enabled ? <Volume2 size={15}/> : <VolumeX size={15}/>}
        </button>
      </div>
    </header>
  );
}
