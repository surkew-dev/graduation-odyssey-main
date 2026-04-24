import { useCallback, useEffect, useRef, useState } from "react";
import { GraduationCap, Award, Zap } from "lucide-react";
import { useSfx } from "./AudioProvider";
import { WinBanner } from "./WinBanner";

interface RunnerGameProps { onComplete: () => void }

const GOAL      = 50;
const LANES     = 3;
const LANE_X    = [18, 50, 82]; // % positions

type ItemKind = "coin"|"diploma"|"star"|"exam"|"deadline"|"coffee"|"shield";

interface Item {
  id: number;
  lane: number;
  y: number;       // 0=spawn top → 100=player zone
  kind: ItemKind;
}

interface Popup {
  id: number; lane: number; text: string; color: string;
}

interface Particle {
  id: number; x: number; y: number; vx: number; vy: number;
  color: string; life: number; maxLife: number; size: number;
}

const ITEM_META: Record<ItemKind, { label: string; bg: string; border: string; color: string; glow?: string }> = {
  coin:     { label:"🪙",  bg:"#fff9e6", border:"#f0c860", color:"#d4922a", glow:"rgb(212 146 42/0.4)" },
  diploma:  { label:"📜",  bg:"#d4922a", border:"#a06018", color:"#fff",    glow:"rgb(212 146 42/0.6)" },
  star:     { label:"⭐",  bg:"#fef9c3", border:"#fde047", color:"#ca8a04", glow:"rgb(234 179 8/0.5)"  },
  exam:     { label:"📝",  bg:"#fef2f2", border:"#fca5a5", color:"#dc2626"  },
  deadline: { label:"⏰",  bg:"#f5f3ff", border:"#c4b5fd", color:"#7c3aed"  },
  coffee:   { label:"☕",  bg:"#fff7ed", border:"#fed7aa", color:"#ea580c"  },
  shield:   { label:"🛡️", bg:"#ecfdf5", border:"#6ee7b7", color:"#059669", glow:"rgb(5 150 105/0.4)"  },
};

const BAD: ItemKind[] = ["exam","deadline","coffee"];
const GOOD: ItemKind[] = ["coin","diploma","star","shield"];

let _uid = 0;
const uid = () => ++_uid;

export function RunnerGame({ onComplete }: RunnerGameProps) {
  const { play } = useSfx();

  const [lane,    setLane]    = useState(1);
  const [credits, setCredits] = useState(0);
  const [items,   setItems]   = useState<Item[]>([]);
  const [popups,  setPopups]  = useState<Popup[]>([]);
  const [particles,setParticles]=useState<Particle[]>([]);
  const [won,     setWon]     = useState(false);
  const [stunned, setStunned] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [shielded,setShielded]= useState(false);
  const [combo,   setCombo]   = useState(0);
  const [hitFlash,setHitFlash]= useState(false);
  const [roadOffset, setRoadOffset] = useState(0);
  const [frame, setFrame]     = useState(0); // for leg animation

  // refs (avoid stale closures in rAF)
  const speedRef     = useRef(1);
  const idRef        = useRef(0);
  const popupIdRef   = useRef(0);
  const wonRef       = useRef(false);
  const stunnedRef   = useRef(false);
  const jumpingRef   = useRef(false);
  const slidingRef   = useRef(false);
  const shieldedRef  = useRef(false);
  const creditsRef   = useRef(0);
  const laneRef      = useRef(1);
  const comboRef     = useRef(0);
  const comboTimer   = useRef<ReturnType<typeof setTimeout>|null>(null);
  const frameRef     = useRef(0);
  const touchStart   = useRef<{x:number;y:number}|null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(()=>{ stunnedRef.current  = stunned;  },[stunned]);
  useEffect(()=>{ jumpingRef.current  = jumping;  },[jumping]);
  useEffect(()=>{ slidingRef.current  = sliding;  },[sliding]);
  useEffect(()=>{ shieldedRef.current = shielded; },[shielded]);

  // ── Actions ──────────────────────────────────────────────
  const changeLane = useCallback((dir:-1|1)=>{
    if(wonRef.current) return;
    setLane(l=>{ const nl=Math.max(0,Math.min(LANES-1,l+dir)); laneRef.current=nl; return nl; });
    play("swoosh");
  },[play]);

  const jump = useCallback(()=>{
    if(wonRef.current||jumpingRef.current||slidingRef.current) return;
    setJumping(true); play("swoosh");
    setTimeout(()=>setJumping(false), 650);
  },[play]);

  const slide = useCallback(()=>{
    if(wonRef.current||jumpingRef.current||slidingRef.current) return;
    setSliding(true); play("swoosh");
    setTimeout(()=>setSliding(false), 650);
  },[play]);

  // ── Keyboard ─────────────────────────────────────────────
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase();
      if(["arrowleft","a"].includes(k)){e.preventDefault();changeLane(-1);}
      else if(["arrowright","d"].includes(k)){e.preventDefault();changeLane(1);}
      else if(["arrowup","w"," "].includes(k)){e.preventDefault();jump();}
      else if(["arrowdown","s"].includes(k)){e.preventDefault();slide();}
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[changeLane,jump,slide]);

  // ── Spawner ───────────────────────────────────────────────
  useEffect(()=>{
    if(won) return;
    const base = 820;
    const intv = setInterval(()=>{
      if(wonRef.current) return;
      const r = Math.random();
      let kind: ItemKind;
      if(r < 0.06)      kind = "shield";
      else if(r < 0.20) kind = "diploma";
      else if(r < 0.25) kind = "star";
      else if(r < 0.55) kind = "coin";
      else               kind = BAD[Math.floor(Math.random()*BAD.length)];
      setItems(a=>[...a,{id:idRef.current++, lane:Math.floor(Math.random()*LANES), y:-12, kind}]);
    }, base);
    return ()=>clearInterval(intv);
  },[won]);

  // ── Main game loop ────────────────────────────────────────
  useEffect(()=>{
    let raf=0, last=performance.now(), frameCount=0;
    const tick=(now:number)=>{
      const dt = Math.min(60, now-last); last=now;
      frameCount++;

      // road scroll
      speedRef.current = Math.min(2.4, 1 + creditsRef.current/110);
      const advance = (dt/16.67)*1.8*speedRef.current;

      setRoadOffset(o=>(o+advance*2)%100);

      // leg animation frame
      if(frameCount%6===0){
        frameRef.current = (frameRef.current+1)%4;
        setFrame(frameRef.current);
      }

      // particles physics
      setParticles(ps=>ps
        .map(p=>({...p, x:p.x+p.vx, y:p.y+p.vy, vy:p.vy+0.18, life:p.life-1}))
        .filter(p=>p.life>0)
      );

      // items
      setItems(arr=>{
        const next:Item[]=[];
        for(const it of arr){
          const ny = it.y+advance;
          if(ny>110) continue;

          // collision zone
          if(ny>84 && ny<100 && it.lane===laneRef.current){
            const isGood = GOOD.includes(it.kind);
            const dodgedByJump  = jumpingRef.current  && (it.kind==="coffee"||it.kind==="deadline");
            const dodgedBySlide = slidingRef.current  && it.kind==="exam";
            const dodged = dodgedByJump||dodgedBySlide;

            if(isGood && !dodged){
              // collect
              let inc = it.kind==="diploma"?6 : it.kind==="star"?3 : it.kind==="shield"?0 : 1;
              comboRef.current++;
              const c = comboRef.current;
              setCombo(c);
              if(comboTimer.current) clearTimeout(comboTimer.current);
              comboTimer.current = setTimeout(()=>{comboRef.current=0;setCombo(0);},1400);

              // combo bonus
              const bonus = c>=3 ? Math.ceil(inc*(1+c*0.4)) : inc;

              if(it.kind==="shield"){
                setShielded(true); shieldedRef.current=true;
                play("coin");
                setTimeout(()=>{setShielded(false);shieldedRef.current=false;},4000);
                addPopup(it.lane,"🛡️ Shield!","#059669");
              } else {
                const newCr = Math.min(GOAL, creditsRef.current+bonus);
                creditsRef.current=newCr; setCredits(newCr);
                play(it.kind==="diploma"||it.kind==="star"?"gold":"coin");
                addPopup(it.lane, c>=3?`+${bonus} ×${c}!`:`+${bonus}`, it.kind==="diploma"?"#d4922a":it.kind==="star"?"#ca8a04":"#3b82f6");
                spawnParticles(LANE_X[it.lane], 80, it.kind==="diploma"||it.kind==="star"?"gold":"blue", 8);

                if(newCr>=GOAL && !wonRef.current){
                  wonRef.current=true; setWon(true); play("win");
                  setTimeout(()=>onCompleteRef.current(),1800);
                }
              }
              continue;
            }

            if(!isGood && !dodged && !stunnedRef.current){
              if(shieldedRef.current){
                // absorb hit with shield
                setShielded(false); shieldedRef.current=false;
                addPopup(it.lane,"🛡️ Blocked!","#059669");
              } else {
                stunnedRef.current=true; setStunned(true);
                setHitFlash(true);
                comboRef.current=0; setCombo(0);
                play("click");
                spawnParticles(LANE_X[laneRef.current], 82, "red", 6);
                setTimeout(()=>{ stunnedRef.current=false; setStunned(false); },600);
                setTimeout(()=>setHitFlash(false),200);
              }
            }
          }
          next.push({...it,y:ny});
        }
        return next;
      });
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);

    function addPopup(ln:number,text:string,color:string){
      const pid=popupIdRef.current++;
      setPopups(p=>[...p,{id:pid,lane:ln,text,color}]);
      setTimeout(()=>setPopups(p=>p.filter(x=>x.id!==pid)),750);
    }
    function spawnParticles(xPct:number,yPct:number,kind:"gold"|"blue"|"red",count:number){
      const colors={ gold:["#f0b84a","#d4922a","#fdd878"], blue:["#60a5fa","#3b82f6","#93c5fd"], red:["#f87171","#ef4444","#fca5a5"] };
      const palette=colors[kind];
      const newPs:Particle[]=Array.from({length:count}).map(()=>({
        id:uid(), x:xPct, y:yPct,
        vx:(Math.random()-0.5)*2.5, vy:-(1+Math.random()*2),
        color:palette[Math.floor(Math.random()*palette.length)],
        life:20+Math.random()*15, maxLife:35, size:3+Math.random()*4,
      }));
      setParticles(ps=>[...ps,...newPs]);
    }
  },[]); // empty — all mutable state via refs

  // ── Touch ─────────────────────────────────────────────────
  const onTouchStart=(e:React.TouchEvent)=>{
    touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
  };
  const onTouchEnd=(e:React.TouchEvent)=>{
    if(!touchStart.current) return;
    const dx=e.changedTouches[0].clientX-touchStart.current.x;
    const dy=e.changedTouches[0].clientY-touchStart.current.y;
    if(Math.abs(dx)<28&&Math.abs(dy)<28) jump();
    else if(Math.abs(dx)>Math.abs(dy)) changeLane(dx>0?1:-1);
    else dy>0?slide():jump();
    touchStart.current=null;
  };

  const pct=(credits/GOAL)*100;

  // Player body parts
  const legAngle  = jumping?0:sliding?0:[-18,0,18,0][frame];
  const bodySquish= sliding?{scaleY:0.6,scaleX:1.3}:jumping?{scaleY:1.1,scaleX:0.9}:{scaleY:1,scaleX:1};

  return (
    <section className="page-bg" style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", padding:"72px 12px 16px" }}>

      {/* Header */}
      <div style={{ width:"100%", maxWidth:480, marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 2px" }}>
        <div>
          <p className="label-caps">Challenge 2 · 3</p>
          <h2 className="display" style={{ fontSize:"1.6rem", color:"var(--ink)", lineHeight:1.1 }}>Campus Run</h2>
        </div>
        {/* Combo badge */}
        <div style={{ opacity:combo>=2?1:0, transition:"opacity 0.2s", background:combo>=5?"var(--gold)":combo>=3?"#f97316":"#3b82f6", color:"#fff", borderRadius:999, padding:"4px 12px", fontSize:"0.72rem", fontWeight:900, boxShadow:`0 3px 0 ${combo>=5?"#a06018":combo>=3?"#c2410c":"#1d4ed8"}`, transform:`scale(${combo>=3?1.05:1})`, transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}>
          ×{combo} COMBO{combo>=5?" 🔥":combo>=3?" ⚡":""}
        </div>
      </div>

      {/* Credit bar */}
      <div style={{ width:"100%", maxWidth:480, marginBottom:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
          <span style={{ fontSize:"0.68rem", fontWeight:800, color:"var(--ink-3)" }}>🪙 {credits} / {GOAL} credits</span>
          <span style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--ink-4)" }}>Speed ×{speedRef.current.toFixed(1)}{shielded?" 🛡️":""}</span>
        </div>
        <div style={{ position:"relative", height:14, background:"var(--bg-muted)", border:"2px solid var(--border-soft)", borderRadius:999, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,#f0b84a,#d4922a)`, borderRadius:999, transition:"width 0.25s cubic-bezier(0.34,1.56,0.64,1)", boxShadow:"0 0 10px rgb(212 146 42/0.5)", position:"relative", overflow:"hidden" }}>
            {/* shimmer */}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)", animation:"shimmer 1.2s linear infinite", backgroundSize:"200% 100%" }}/>
          </div>
          {/* milestone markers */}
          {[25,50,75].map(m=>(
            <div key={m} style={{ position:"absolute", top:0, bottom:0, left:`${m}%`, width:2, background:credits/GOAL*100>=m?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.08)", borderRadius:1 }}/>
          ))}
        </div>
      </div>

      {/* ── GAME CANVAS ─────────────────────────────── */}
      <div
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{
          position:"relative", width:"100%", maxWidth:480,
          height:"min(60vh,500px)",
          borderRadius:22, overflow:"hidden",
          touchAction:"none", flexShrink:0,
          boxShadow:"0 12px 40px rgb(42 33 24/0.18), 0 4px 0 var(--border)",
          border:"2px solid var(--border-soft)",
          outline: hitFlash?"3px solid #ef4444":"3px solid transparent",
          transition:"outline 0.08s",
        }}
      >
        {/* ─ Sky ─ */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,#bae6fd 0%,#e0f2fe 45%,#fef9c3 72%,#fde68a 100%)" }}/>

        {/* ─ Sun ─ */}
        <div style={{ position:"absolute", top:"8%", right:"12%", width:36, height:36, borderRadius:"50%", background:"radial-gradient(circle,#fde047 0%,#f59e0b 70%,transparent 100%)", boxShadow:"0 0 20px rgb(251 191 36/0.7), 0 0 40px rgb(251 191 36/0.3)" }}/>

        {/* ─ Clouds (parallax) ─ */}
        {[
          {top:"10%",left:"5%", w:70,h:22,speed:0.3},
          {top:"6%", left:"35%",w:50,h:16,speed:0.5},
          {top:"14%",left:"60%",w:65,h:20,speed:0.25},
          {top:"4%", left:"75%",w:40,h:13,speed:0.4},
        ].map((c,i)=>(
          <div key={i} style={{ position:"absolute", top:c.top, left:`calc(${c.left} - ${(roadOffset*c.speed)%120}px)`, width:c.w, height:c.h, pointerEvents:"none" }}>
            <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.92)", borderRadius:999, filter:"blur(3px)" }}/>
            <div style={{ position:"absolute", top:"15%", left:"20%", width:"60%", height:"130%", background:"rgba(255,255,255,0.85)", borderRadius:999, filter:"blur(2px)" }}/>
          </div>
        ))}

        {/* ─ Campus buildings horizon ─ */}
        <div style={{ position:"absolute", bottom:"36%", left:0, right:0, height:52, pointerEvents:"none" }}>
          <svg viewBox="0 0 400 52" style={{ width:"100%", height:"100%" }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="bldg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#92683a" stopOpacity="0.5"/>
                <stop offset="100%" stopColor="#7a5530" stopOpacity="0.7"/>
              </linearGradient>
            </defs>
            <path d="M0 52 L0 38 L20 38 L20 26 L28 26 L28 20 L36 20 L36 26 L44 26 L44 38 L60 38 L60 14 L68 14 L68 8 L76 8 L76 14 L84 14 L84 38 L100 38 L100 28 L112 28 L112 22 L120 22 L120 16 L128 16 L128 22 L136 22 L136 28 L148 28 L148 38 L160 38 L160 22 L170 22 L170 38 L185 38 L185 10 L192 10 L192 4 L200 4 L200 10 L207 10 L207 38 L220 38 L220 30 L232 30 L232 38 L248 38 L248 18 L256 18 L256 10 L264 10 L264 18 L272 18 L272 38 L288 38 L288 26 L298 26 L298 38 L310 38 L310 14 L318 14 L318 8 L326 8 L326 14 L334 14 L334 38 L350 38 L350 28 L360 28 L360 38 L375 38 L375 20 L383 20 L383 38 L400 38 L400 52 Z" fill="url(#bldg)"/>
            {/* windows */}
            {[[70,10],[74,10],[70,16],[74,16],[123,18],[196,6],[260,12],[264,12],[320,10],[324,10]].map(([x,y],i)=>(
              <rect key={i} x={x} y={y} width="5" height="4" fill="#fde68a" opacity="0.8"/>
            ))}
          </svg>
        </div>

        {/* ─ Road ─ */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"38%", overflow:"hidden" }}>
          {/* Asphalt */}
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,#94a3b8 0%,#78909c 100%)" }}/>
          {/* Road texture lines */}
          <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(180deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 2px, transparent 2px, transparent 18px)" }}/>
          {/* Lane stripes - animated */}
          {[33,67].map(x=>(
            <div key={x} style={{ position:"absolute", top:0, bottom:0, left:`${x}%`, width:3 }}>
              <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(180deg,rgba(255,255,255,0.7) 0px,rgba(255,255,255,0.7) 24px,transparent 24px,transparent 44px)", backgroundPositionY:`${roadOffset*3}px` }}/>
            </div>
          ))}
          {/* Kerb */}
          <div style={{ position:"absolute", top:0, left:0, right:0, height:4, background:"linear-gradient(180deg,rgba(255,255,255,0.15),transparent)" }}/>
          {/* Sidewalk edges */}
          <div style={{ position:"absolute", top:0, left:0, width:8, bottom:0, background:"linear-gradient(90deg,#c8b89a,#b8a882)", borderRight:"2px solid #a89870" }}/>
          <div style={{ position:"absolute", top:0, right:0, width:8, bottom:0, background:"linear-gradient(90deg,#b8a882,#c8b89a)", borderLeft:"2px solid #a89870" }}/>
        </div>

        {/* ─ Perspective lane guides ─ */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="18" y1="62" x2="10" y2="100" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4"/>
          <line x1="50" y1="62" x2="50" y2="100" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4"/>
          <line x1="82" y1="62" x2="90" y2="100" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4"/>
        </svg>

        {/* ─ Particles ─ */}
        {particles.map(p=>(
          <div key={p.id} style={{ position:"absolute", left:`${p.x}%`, top:`${p.y}%`, width:p.size, height:p.size, borderRadius:"50%", background:p.color, opacity:p.life/p.maxLife, transform:"translate(-50%,-50%)", pointerEvents:"none", transition:"none" }}/>
        ))}

        {/* ─ Items ─ */}
        {items.map(it=>{
          const lx = LANE_X[it.lane];
          const scale = 0.35+(it.y/100)*0.9;
          const topPct = 28+(it.y/100)*56;
          const meta = ITEM_META[it.kind];
          const isBad = BAD.includes(it.kind);
          return (
            <div key={it.id} style={{ position:"absolute", left:`${lx}%`, top:`${topPct}%`, transform:`translate(-50%,-50%) scale(${scale})`, pointerEvents:"none", filter:isBad?"saturate(1.3)":"none" }}>
              {/* shadow */}
              <div style={{ position:"absolute", bottom:-4, left:"50%", transform:"translateX(-50%)", width:40, height:8, borderRadius:"50%", background:"rgba(0,0,0,0.15)", filter:"blur(3px)" }}/>
              {/* item circle */}
              <div style={{
                width:it.kind==="diploma"?52:44, height:it.kind==="diploma"?52:44,
                borderRadius: isBad?12:"50%",
                background:meta.bg, border:`2.5px solid ${meta.border}`,
                display:"grid", placeItems:"center",
                fontSize:it.kind==="diploma"?22:18,
                boxShadow: meta.glow?`0 4px 0 ${meta.border}, 0 0 16px ${meta.glow}`:`0 3px 0 ${meta.border}`,
                animation:it.kind==="diploma"||it.kind==="star"?"bob 1s ease-in-out infinite":undefined,
              }}>
                {meta.label}
              </div>
            </div>
          );
        })}

        {/* ─ Popups ─ */}
        {popups.map(p=>(
          <div key={p.id} style={{
            position:"absolute", left:`${LANE_X[p.lane]}%`, top:"70%",
            transform:"translateX(-50%)", pointerEvents:"none",
            fontSize:"0.95rem", fontWeight:900, fontFamily:"'Nunito',sans-serif",
            color:p.color, whiteSpace:"nowrap",
            textShadow:"0 1px 6px rgba(0,0,0,0.15)",
            animation:"pop-up 0.75s cubic-bezier(0.22,1,0.36,1) both",
          }}>{p.text}</div>
        ))}

        {/* ─ Player ─ */}
        <div style={{
          position:"absolute",
          bottom:"5%", left:`${LANE_X[lane]}%`,
          transform:"translateX(-50%)",
          transition:"left 0.16s cubic-bezier(0.22,1,0.36,1)",
          pointerEvents:"none",
          display:"flex", flexDirection:"column", alignItems:"center",
        }}>
          {/* shield ring */}
          {shielded && (
            <div style={{ position:"absolute", inset:-8, borderRadius:"50%", border:"3px solid #34d399", boxShadow:"0 0 16px rgb(52 211 153/0.6), inset 0 0 10px rgb(52 211 153/0.2)", animation:"pulse-soft 1s ease-in-out infinite", zIndex:2 }}/>
          )}

          <div style={{
            transition:"transform 0.25s cubic-bezier(0.22,1,0.36,1)",
            transform:`translateY(${jumping?-56:sliding?8:0}px) scaleY(${bodySquish.scaleY}) scaleX(${bodySquish.scaleX})`,
            opacity: stunned?0.3:1,
            display:"flex", flexDirection:"column", alignItems:"center",
            position:"relative",
          }}>
            {/* Character: body */}
            <div style={{ position:"relative", width:48, height:48, borderRadius:"50%", background: stunned?"#ef4444":shielded?"#34d399":"var(--sky)", boxShadow:`0 4px 0 ${stunned?"#b91c1c":shielded?"#059669":"#1d4ed8"}, 0 0 ${shielded?20:12}px ${stunned?"rgb(239 68 68/0.5)":shielded?"rgb(52 211 153/0.5)":"rgb(59 130 246/0.4)"}`, display:"grid", placeItems:"center", transition:"background 0.2s, box-shadow 0.2s", zIndex:1 }}>
              <GraduationCap size={24} color="#fff"/>
            </div>

            {/* Legs (only when running) */}
            {!jumping && !sliding && (
              <div style={{ display:"flex", gap:6, marginTop:-2, position:"relative", zIndex:0 }}>
                {/* Left leg */}
                <div style={{ width:8, height:16, background:"#1d4ed8", borderRadius:"4px 4px 6px 6px", transformOrigin:"top center", transform:`rotate(${-legAngle}deg)`, transition:"transform 0.08s" }}>
                  <div style={{ position:"absolute", bottom:-4, left:-2, width:12, height:6, background:"#1e3a8a", borderRadius:4 }}/>
                </div>
                {/* Right leg */}
                <div style={{ width:8, height:16, background:"#1d4ed8", borderRadius:"4px 4px 6px 6px", transformOrigin:"top center", transform:`rotate(${legAngle}deg)`, transition:"transform 0.08s" }}>
                  <div style={{ position:"absolute", bottom:-4, left:-2, width:12, height:6, background:"#1e3a8a", borderRadius:4 }}/>
                </div>
              </div>
            )}

            {/* Slide pose */}
            {sliding && (
              <div style={{ marginTop:2, width:32, height:10, background:"#1d4ed8", borderRadius:6 }}/>
            )}
          </div>

          {/* Ground shadow */}
          <div style={{ marginTop:2, width:jumping?20:sliding?40:32, height:5, borderRadius:"50%", background:"rgba(0,0,0,0.12)", filter:"blur(3px)", transition:"width 0.2s" }}/>
        </div>

        {/* Tip */}
        {items.length===0&&!won&&(
          <div style={{ position:"absolute", bottom:"20%", left:0, right:0, textAlign:"center", pointerEvents:"none" }}>
            <p style={{ fontSize:"0.75rem", fontWeight:700, color:"rgba(42,33,24,0.4)" }}>Tap or press arrow keys to move!</p>
          </div>
        )}
      </div>

      {/* ─ Controls ─ */}
      <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, width:"100%", maxWidth:480 }}>
        {([
          {label:"◀ Left",  fn:()=>changeLane(-1)},
          {label:"▲ Jump",  fn:jump},
          {label:"▼ Slide", fn:slide},
          {label:"Right ▶", fn:()=>changeLane(1)},
        ]).map(({label,fn})=>(
          <button key={label} className="btn-game" onClick={fn} style={{ fontSize:"0.72rem", padding:"10px 4px" }}>{label}</button>
        ))}
      </div>

      {/* Legend */}
      <div style={{ marginTop:8, display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
        {[
          {emoji:"🪙",label:"Coin +1"},
          {emoji:"📜",label:"Diploma +6"},
          {emoji:"⭐",label:"Star +3"},
          {emoji:"🛡️",label:"Shield"},
          {emoji:"📝",label:"Avoid!"},
        ].map(({emoji,label})=>(
          <span key={label} style={{ fontSize:"0.62rem", fontWeight:700, color:"var(--ink-3)", display:"flex", alignItems:"center", gap:3 }}>{emoji} {label}</span>
        ))}
      </div>

      {won && <WinBanner label="Campus Run Complete!" />}
    </section>
  );
}
