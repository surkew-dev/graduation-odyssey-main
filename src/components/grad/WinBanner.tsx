import { CheckCircle2, Star } from "lucide-react";

export function WinBanner({ label }: { label: string }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:30, display:"flex", alignItems:"center", justifyContent:"center", padding:16, pointerEvents:"none" }}>
      <div style={{
        background:"var(--bg-card)",
        border:"2px solid var(--gold-border)",
        borderRadius:24,
        padding:"28px 40px",
        textAlign:"center",
        boxShadow:"var(--shadow-xl), 0 0 0 6px rgb(240 184 74/0.15)",
        animation:"banner-in 0.55s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:8 }}>
          <Star size={13} fill="var(--gold-2)" color="var(--gold-2)" />
          <span style={{ fontSize:"0.62rem", fontWeight:800, letterSpacing:"0.2em", textTransform:"uppercase", color:"var(--gold)" }}>Complete!</span>
          <Star size={13} fill="var(--gold-2)" color="var(--gold-2)" />
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
          <CheckCircle2 size={24} color="var(--gold)" />
          <h3 className="display" style={{ fontSize:"1.5rem", color:"var(--ink)" }}>{label}</h3>
        </div>
        <div style={{ marginTop:14, height:3, background:"linear-gradient(90deg, transparent, var(--gold-2), transparent)", borderRadius:999, animation:"sweep 0.6s ease 0.3s both" }} />
      </div>
    </div>
  );
}
