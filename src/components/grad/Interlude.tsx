import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";

interface InterludeProps {
  step: 2 | 3;
  title: string;
  subtitle: string;
  onContinue: () => void;
}

export function Interlude({ step, title, subtitle, onContinue }: InterludeProps) {
  const [out, setOut] = useState(false);
  const ref = useRef(onContinue);
  ref.current = onContinue;

  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 2000);
    const t2 = setTimeout(() => ref.current(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="page-bg" style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{
        textAlign:"center",
        transition:"all 0.5s cubic-bezier(0.65,0,0.35,1)",
        opacity: out ? 0 : 1,
        transform: out ? "translateY(-10px)" : "translateY(0)",
      }}>
        {/* Cleared badge */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:14 }}>
          <div style={{ width:30, height:30, borderRadius:"50%", background:"var(--gold-bg)", border:"1.5px solid var(--gold-border)", display:"grid", placeItems:"center" }}>
            <CheckCircle2 size={16} color="var(--gold)" />
          </div>
          <span style={{ fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.18em", textTransform:"uppercase", color:"var(--gold)" }}>
            Challenge {step - 1} Cleared!
          </span>
        </div>

        {/* Next label */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:10 }}>
          <span style={{ fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--ink-3)" }}>
            Up next · {step}/3
          </span>
          <ChevronRight size={13} color="var(--ink-4)" />
        </div>

        <h2 className="display" style={{ fontSize:"clamp(2.8rem,10vw,4.2rem)", color:"var(--gold)" }}>{title}</h2>
        <p style={{ marginTop:8, fontSize:"0.95rem", color:"var(--ink-3)", lineHeight:1.6 }}>{subtitle}</p>
      </div>
    </section>
  );
}
