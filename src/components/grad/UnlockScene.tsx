import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Share2, RotateCcw, GraduationCap, MapPin, Clock, Sparkles, Heart, PartyPopper } from "lucide-react";
import { useSfx } from "./AudioProvider";
 
interface UnlockSceneProps { onReplay: () => void }
 
const EVENT = {
  graduate:    "Surkew",
  degree:      "Bachelor of Information Systems Engineering",
  institution: "Erbil Polytechnic University",
  date:        "Monday, April 27, 2026",
  time:        "2:00 PM",
  venue:       "Erbil Polytechnic University & Campus 2",
  venueLink:   "https://maps.app.goo.gl/XYiBwmaoWBToQr7Y9",
  dressCode:   "Smart casual · Navy & gold touches",
};
 
type Phase = "rsvp" | "accepted" | "card";
 
export function UnlockScene({ onReplay }: UnlockSceneProps) {
  const { play } = useSfx();
  const [phase,   setPhase]   = useState<Phase>("rsvp");
  const [opened,  setOpened]  = useState(false);
  const [noPos,   setNoPos]   = useState({ x: 0, y: 0 });
  const [noEscapes, setNoEscapes] = useState(0);
  const noRef    = useRef<HTMLButtonElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
 
  // Curtain open on card phase
  useEffect(()=>{
    if(phase!=="card") return;
    const t = setTimeout(()=>{ setOpened(true); play("confetti"); }, 80);
    return ()=>clearTimeout(t);
  },[phase, play]);
 
  // Nudge "No" away on hover/focus/touch
  const escapeNo = () => {
    if(!arenaRef.current||!noRef.current) return;
    const arena = arenaRef.current.getBoundingClientRect();
    const btn   = noRef.current.getBoundingClientRect();
    const bw    = btn.width, bh = btn.height;
    const maxX  = arena.width  - bw - 16;
    const maxY  = arena.height - bh - 16;
    // pick a random position far from current
    let nx = Math.random() * maxX;
    let ny = Math.random() * maxY;
    setNoPos({ x: nx, y: ny });
    setNoEscapes(n => n+1);
    play("swoosh");
  };
 
  const handleYes = () => {
    play("gold");
    setPhase("accepted");
    setTimeout(()=>setPhase("card"), 2200);
  };
 
  const confetti = useMemo(()=>
    Array.from({length:90}).map((_,i)=>{
      const colors=["#d4922a","#f0b84a","#fdd878","#3b82f6","#60a5fa","#ffffff","#22c55e","#e05555","#a78bfa","#f472b6"];
      return { id:i, left:Math.random()*100, delay:Math.random()*2.5, dur:3.5+Math.random()*3, size:5+Math.random()*10, color:colors[i%colors.length], rot:Math.random()*360 };
    }),[]);
 
  const handleAddCal=()=>{
    play("click");
    const dt=new Date(EVENT.date+" "+EVENT.time);
    const fmt=(d:Date)=>d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
    const end=new Date(dt.getTime()+3*60*60*1000);
    const ics=["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT",`UID:${Date.now()}@grad`,`DTSTAMP:${fmt(new Date())}`,`DTSTART:${fmt(dt)}`,`DTEND:${fmt(end)}`,`SUMMARY:${EVENT.graduate} — Graduation`,`LOCATION:${EVENT.venue}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
    const a=Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([ics],{type:"text/calendar"})),download:"graduation.ics"});
    a.click();
  };
 
  const handleShare=async()=>{
    play("click");
    try{ if(navigator.share) await navigator.share({title:"Graduation Invitation",url:window.location.href}); else await navigator.clipboard.writeText(window.location.href); }catch{}
  };
 
  const row=(Icon:React.ElementType,text:string,color:string,bg:string,border:string)=>(
    <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
      <div style={{ width:30, height:30, borderRadius:9, background:bg, border:`1.5px solid ${border}`, display:"grid", placeItems:"center", flexShrink:0, marginTop:1 }}>
        <Icon size={14} color={color}/>
      </div>
      <span style={{ fontSize:"0.82rem", color:"var(--ink-2)", lineHeight:1.5 }}>{text}</span>
    </div>
  );
 
  // ── RSVP PHASE ─────────────────────────────────────────────────────────────
  if(phase==="rsvp") return (
    <section className="page-bg dots-bg" style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", gap:32, position:"relative", overflow:"hidden" }}>
 
      {/* Decorative stars */}
      {["10% 15%","85% 10%","5% 75%","92% 70%","50% 5%"].map((pos,i)=>(
        <div key={i} style={{ position:"absolute", top:pos.split(" ")[1], left:pos.split(" ")[0], fontSize:["1.4rem","1rem","1.8rem","1.2rem","1rem"][i], opacity:0.25, animation:`bob ${2+i*0.4}s ease-in-out infinite`, animationDelay:`${i*0.3}s`, pointerEvents:"none" }}>⭐</div>
      ))}
 
      <div className="animate-slide-up" style={{ textAlign:"center", maxWidth:400 }}>
        {/* Envelope icon */}
        <div style={{ fontSize:72, marginBottom:16, animation:"bob 2.5s ease-in-out infinite" }}>🎉</div>
        <p className="label-caps" style={{ color:"var(--gold)", marginBottom:8 }}>You completed all 3 challenges!</p>
        <h1 className="display" style={{ fontSize:"clamp(2rem,7vw,2.8rem)", color:"var(--ink)", marginBottom:12, lineHeight:1.1 }}>
          Will you attend the<br/>
          <span style={{ color:"var(--gold)" }}>Graduation Party?</span>
        </h1>
        <p style={{ fontSize:"0.88rem", color:"var(--ink-3)", lineHeight:1.6 }}>
          {EVENT.graduate} would love to celebrate with you on <strong style={{ color:"var(--ink-2)" }}>{EVENT.date}</strong>.
        </p>
      </div>
 
      {/* YES button — standalone, prominent */}
      <button
        className="btn-primary animate-slide-up"
        onClick={handleYes}
        style={{
          fontSize:"1.1rem", padding:"16px 48px",
          borderRadius:999,
          animation:"breathe 2.4s ease-in-out infinite",
          animationDelay:"0.15s",
        }}
      >
        <Heart size={18} fill="white" color="white" /> Yes, I'll be there! 🎊
      </button>
 
      {/* NO button arena — separate from YES, always visible below it */}
      <div
        ref={arenaRef}
        className="animate-slide-up"
        style={{ position:"relative", width:"100%", maxWidth:400, height:90, animationDelay:"0.25s" }}
      >
        {/* NO button — escapes on hover/touch, stays within its own arena */}
        <button
          ref={noRef}
          onMouseEnter={escapeNo}
          onFocus={escapeNo}
          onTouchStart={escapeNo}
          aria-label="No (unavailable)"
          style={{
            position:"absolute",
            left: noEscapes===0 ? "50%" : noPos.x,
            top:  noEscapes===0 ? "50%" : noPos.y,
            transform: noEscapes===0 ? "translate(-50%,-50%)" : "none",
            transition:"left 0.35s cubic-bezier(0.34,1.56,0.64,1), top 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s",
            padding:"10px 24px",
            borderRadius:999,
            background:"transparent",
            border:"1.5px solid var(--border)",
            color:"var(--ink-4)",
            fontSize:"0.82rem",
            fontWeight:700,
            cursor:"default",
            userSelect:"none",
            opacity: noEscapes>=3 ? 0.3 : 1,
            zIndex:1,
            pointerEvents: noEscapes>=5 ? "none" : "auto",
            whiteSpace:"nowrap",
          } as React.CSSProperties}
        >
          {noEscapes===0?"No, I can't":noEscapes===1?"Wait, no...":noEscapes===2?"Stop following me!":noEscapes===3?"I said no!":"...okay fine 😅"}
        </button>
      </div>
 
      {noEscapes>0&&(
        <p className="animate-fade-in" style={{ fontSize:"0.7rem", color:"var(--ink-4)", fontStyle:"italic", marginTop:-16 }}>
          {noEscapes===1?"(That button doesn't seem to want to be clicked...)"
           :noEscapes===2?"(It keeps running away! 🏃)"
           :noEscapes===3?"(The No button is very shy 👀)"
           :noEscapes>=4?"(Some buttons just weren't meant to be clicked 😂)":""}
        </p>
      )}
    </section>
  );
 
  // ── ACCEPTED PHASE ──────────────────────────────────────────────────────────
  if(phase==="accepted") return (
    <section className="page-bg" style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, padding:24, textAlign:"center", overflow:"hidden", position:"relative" }}>
      {/* Burst confetti immediately */}
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
        {confetti.map(c=>(
          <span key={c.id} style={{ position:"absolute", display:"block", left:`${c.left}%`, top:"-10vh", width:c.size, height:c.size*0.45, background:c.color, borderRadius:2, transform:`rotate(${c.rot}deg)`, animation:`confetti-fall ${c.dur}s ease ${c.delay*0.3}s forwards` }}/>
        ))}
      </div>
 
      <div className="animate-scale-in" style={{ zIndex:2 }}>
        <div style={{ fontSize:88, marginBottom:8, animation:"bob 1.2s ease-in-out infinite" }}>🎊</div>
        <h1 className="display" style={{ fontSize:"clamp(2.2rem,8vw,3.2rem)", color:"var(--gold)", marginBottom:10, lineHeight:1.1 }}>
          Amazing!<br/>You're coming!
        </h1>
        <p style={{ fontSize:"0.95rem", color:"var(--ink-3)", lineHeight:1.7, maxWidth:320, margin:"0 auto" }}>
          Your invitation is being prepared... ✨<br/>
          <span style={{ fontSize:"0.75rem", color:"var(--ink-4)" }}>Just a moment</span>
        </p>
 
        {/* Loading dots */}
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:20 }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:"var(--gold)", animation:`pip-pulse 1s ease-in-out infinite`, animationDelay:`${i*0.25}s` }}/>
          ))}
        </div>
      </div>
    </section>
  );
 
  // ── INVITATION CARD PHASE ───────────────────────────────────────────────────
  return (
    <section className="page-bg dots-bg" style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", padding:"80px 16px", position:"relative" }}>
 
      {/* Curtains */}
      <div style={{ position:"absolute", top:0, bottom:0, left:0, width:"50%", background:"var(--bg)", zIndex:20, borderRight:"2px solid var(--gold-border)", animation:opened?"cut-left 1.1s cubic-bezier(0.22,1,0.36,1) both":undefined }} aria-hidden/>
      <div style={{ position:"absolute", top:0, bottom:0, right:0, width:"50%", background:"var(--bg)", zIndex:20, borderLeft:"2px solid var(--gold-border)", animation:opened?"cut-right 1.1s cubic-bezier(0.22,1,0.36,1) both":undefined }} aria-hidden/>
 
      {/* Confetti */}
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:10 }}>
        {confetti.map(c=>(
          <span key={c.id} style={{ position:"absolute", display:"block", left:`${c.left}%`, top:"-10vh", width:c.size, height:c.size*0.45, background:c.color, borderRadius:2, transform:`rotate(${c.rot}deg)`, animation:`confetti-fall ${c.dur}s ease ${c.delay}s forwards`, opacity:opened?1:0 }}/>
        ))}
      </div>
 
      {/* Invitation card */}
      <article className="animate-scale-in" style={{ position:"relative", zIndex:30, width:"100%", maxWidth:440, background:"var(--bg-card)", border:"2px solid var(--gold-border)", borderRadius:28, padding:"clamp(24px,5vw,40px)", boxShadow:"var(--shadow-xl), 0 0 0 6px rgb(240 184 74/0.15)", animationDelay:"0.45s" }}>
 
        {/* Corner accents */}
        {([[0,0,"24px 0 0 0"],[0,1,"0 24px 0 0"],[1,0,"0 0 0 24px"],[1,1,"0 0 24px 0"]] as const).map(([r,c,br],i)=>(
          <div key={i} style={{ position:"absolute", top:r?"auto":0, bottom:r?0:"auto", left:c?"auto":0, right:c?0:"auto", width:22, height:22, borderTop:!r?"2px solid var(--gold-border)":undefined, borderBottom:r?"2px solid var(--gold-border)":undefined, borderLeft:!c?"2px solid var(--gold-border)":undefined, borderRight:c?"2px solid var(--gold-border)":undefined, borderRadius:br }}/>
        ))}
 
        {/* Accepted stamp */}
        <div style={{ position:"absolute", top:18, right:18, background:"#dcfce7", border:"2px solid #86efac", borderRadius:999, padding:"3px 10px", fontSize:"0.6rem", fontWeight:900, letterSpacing:"0.15em", textTransform:"uppercase", color:"#16a34a", transform:"rotate(8deg)" }}>
          ✓ Attending
        </div>
 
        {/* Seal */}
        <div style={{ marginBottom:18, display:"flex", justifyContent:"center" }}>
          <div style={{ width:72, height:72, borderRadius:"50%", background:"var(--gold)", display:"grid", placeItems:"center", boxShadow:"0 6px 0 #a06018, 0 0 28px rgb(212 146 42/0.45)" }}>
            <GraduationCap size={34} color="#fff"/>
          </div>
        </div>
 
        <p className="label-caps" style={{ textAlign:"center", color:"var(--gold)", marginBottom:6 }}>You are cordially invited</p>
        <p style={{ textAlign:"center", fontSize:"0.8rem", color:"var(--ink-3)", marginBottom:10 }}>to celebrate the graduation of</p>
 
        <h1 className="display" style={{ textAlign:"center", fontSize:"clamp(1.7rem,6vw,2.3rem)", color:"var(--ink)", marginBottom:4 }}>{EVENT.graduate}</h1>
        <p style={{ textAlign:"center", fontWeight:800, color:"var(--gold)", fontSize:"0.85rem" }}>{EVENT.degree}</p>
        <p style={{ textAlign:"center", fontSize:"0.72rem", color:"var(--ink-3)", marginTop:2 }}>{EVENT.institution}</p>
 
        <div style={{ height:1, background:"linear-gradient(90deg,transparent,var(--gold-border),transparent)", margin:"20px 0" }}/>
 
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {row(Calendar,EVENT.date,     "#d4922a","#fff8e6","#f0c860")}
          {row(Clock,   EVENT.time,     "#d4922a","#fff8e6","#f0c860")}
          <div
  onClick={() => window.open(EVENT.venueLink, "_blank")}
  style={{ cursor:"pointer" }}
>
  {row(MapPin, EVENT.venue, "#3b82f6","#eff6ff","#bfdbfe")}
</div>
          {row(Sparkles,EVENT.dressCode,"#8b5cf6","#f5f3ff","#e9d5ff")}
        </div>
 
        <div style={{ height:1, background:"linear-gradient(90deg,transparent,var(--gold-border),transparent)", margin:"20px 0" }}/>
 
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <button className="btn-outline" onClick={handleAddCal} style={{ justifyContent:"center" }}>
            <Calendar size={14}/> Add to Cal
          </button>
          <button className="btn-outline" onClick={handleShare} style={{ justifyContent:"center" }}>
            <Share2 size={14}/> Share
          </button>
        </div>
 
        <p style={{ marginTop:16, textAlign:"center", fontSize:"0.68rem", color:"var(--ink-4)" }}>
           <span style={{ fontWeight:800, color:"var(--gold)" }}>{EVENT.rsvp}</span>
        </p>
      </article>
 
      {/* Play again */}
      <button
        className="btn-outline"
        onClick={()=>{ play("click"); onReplay(); }}
        style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", zIndex:40, background:"rgba(255,253,248,0.92)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)" }}
      >
        <RotateCcw size={13}/> Play Again
      </button>
    </section>
  );
}
 