import { useCallback, useEffect, useRef, useState } from "react";
import { useSfx } from "./AudioProvider";
import { WinBanner } from "./WinBanner";
 
interface SliceGameProps { onComplete: () => void }
 
const GOAL = 20;
type SliceKind = "cap"|"diploma"|"star"|"bad"|"final";
 
interface SliceItem {
  id: number; kind: SliceKind;
  x: number; y: number;       // % of container
  vx: number; vy: number;     // %/frame
  rot: number; rotV: number;  // degrees
  sliced?: boolean; slicedAt?: number;
  scale: number;
}
 
interface TrailSeg { id: number; x1:number; y1:number; x2:number; y2:number; age:number }
interface Spark    { id:number; x:number; y:number; vx:number; vy:number; color:string; life:number }
 
const META: Record<SliceKind,{emoji:string;pts:number;glow:string;warn?:boolean}> = {
  cap:    { emoji:"🎓", pts:1,  glow:"#3b82f6" },
  diploma:{ emoji:"📜", pts:2,  glow:"#d4922a" },
  star:   { emoji:"⭐", pts:3,  glow:"#eab308" },
  bad:    { emoji:"💀", pts:-2, glow:"#ef4444", warn:true },
  final:  { emoji:"🏆", pts:5,  glow:"#d4922a" },
};
 
let _sid = 0;
const sid = () => ++_sid;
 
export function SliceGame({ onComplete }: SliceGameProps) {
  const { play } = useSfx();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const ctxRef       = useRef<CanvasRenderingContext2D|null>(null);
 
  const [items,    setItems]   = useState<SliceItem[]>([]);
  const [sparks,   setSparks]  = useState<Spark[]>([]);
  const [meter,    setMeter]   = useState(0);
  const [combo,    setCombo]   = useState(0);
  const [popups,   setPopups]  = useState<Array<{id:number;x:number;y:number;text:string;color:string}>>([]);
  const [won,      setWon]     = useState(false);
  const [bgPulse,  setBgPulse] = useState(false);
 
  const meterRef   = useRef(0);
  const wonRef     = useRef(false);
  const finalRef   = useRef(false);
  const comboRef   = useRef(0);
  const comboTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const pointer    = useRef<{x:number;y:number}|null>(null);
  const prevPointer= useRef<{x:number;y:number}|null>(null);
  const trailSegs  = useRef<TrailSeg[]>([]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
 
  useEffect(()=>{ meterRef.current = meter; },[meter]);
 
  // Canvas trail renderer
  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;
    ctxRef.current = ctx;
 
    const resize = ()=>{
      if(!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      canvas.width  = r.width;
      canvas.height = r.height;
    };
    resize();
    window.addEventListener("resize", resize);
 
    let raf = 0;
    const draw = ()=>{
      if(!ctxRef.current||!canvas) return;
      ctxRef.current.clearRect(0,0,canvas.width,canvas.height);
 
      trailSegs.current = trailSegs.current
        .map(s=>({...s,age:s.age+1}))
        .filter(s=>s.age<18);
 
      for(const seg of trailSegs.current){
        const t = 1 - seg.age/18;
        const w = t*14;
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(seg.x1*(canvas.width/100), seg.y1*(canvas.height/100));
        ctxRef.current.lineTo(seg.x2*(canvas.width/100), seg.y2*(canvas.height/100));
        const grad = ctxRef.current.createLinearGradient(
          seg.x1*(canvas.width/100), seg.y1*(canvas.height/100),
          seg.x2*(canvas.width/100), seg.y2*(canvas.height/100)
        );
        grad.addColorStop(0, `rgba(255,220,80,${t*0.9})`);
        grad.addColorStop(0.5,`rgba(255,140,0,${t*0.7})`);
        grad.addColorStop(1, `rgba(255,80,80,${t*0.3})`);
        ctxRef.current.strokeStyle = grad;
        ctxRef.current.lineWidth = w;
        ctxRef.current.lineCap  = "round";
        ctxRef.current.lineJoin = "round";
        ctxRef.current.stroke();
        // white core
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(seg.x1*(canvas.width/100), seg.y1*(canvas.height/100));
        ctxRef.current.lineTo(seg.x2*(canvas.width/100), seg.y2*(canvas.height/100));
        ctxRef.current.strokeStyle = `rgba(255,255,255,${t*0.6})`;
        ctxRef.current.lineWidth   = w*0.3;
        ctxRef.current.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);
 
  // Spark physics
  useEffect(()=>{
    let raf=0;
    const tick=()=>{
      setSparks(ss=>ss.map(s=>({...s,x:s.x+s.vx,y:s.y+s.vy,vy:s.vy+0.25,life:s.life-1})).filter(s=>s.life>0));
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[]);
 
  // Item physics
  useEffect(()=>{
    let raf=0;
    const tick=()=>{
      setItems(arr=>arr
        .map(it=>it.sliced?it:({...it, x:it.x+it.vx, y:it.y+it.vy, vy:it.vy+0.025, rot:it.rot+it.rotV}))
        .filter(it=>!(it.y>115 && !it.sliced) && !(it.sliced && it.slicedAt && Date.now()-it.slicedAt>350))
      );
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[]);
 
  // Spawner
  useEffect(()=>{
    if(won) return;
    const intv=setInterval(()=>{
      if(wonRef.current) return;
      const finalReady = meterRef.current>=GOAL && !finalRef.current;
      let kind:SliceKind;
      if(finalReady){kind="final";finalRef.current=true;}
      else{const r=Math.random(); kind = r<0.12?"bad":r<0.28?"star":r<0.50?"diploma":"cap";}
 
      const fromLeft = Math.random()<0.5;
      const x  = fromLeft ? -8 : 108;
      const y  = 25+Math.random()*50;
      const spd= 0.28+Math.random()*0.28;
      const vx = fromLeft ? spd : -spd;
      const vy = -(1.1+Math.random()*0.7);
      setItems(a=>[...a,{id:sid(),kind,x,y,vx,vy,rot:Math.random()*360,rotV:(Math.random()-0.5)*3,scale:kind==="final"?1.5:kind==="bad"?0.9:1}]);
    }, won?99999:950);
    return ()=>clearInterval(intv);
  },[won]);
 
  // Hit detection on pointer move
  const hitTest = useCallback((px:number,py:number,ppx:number,ppy:number)=>{
    if(!containerRef.current||wonRef.current) return;
    const r  = containerRef.current.getBoundingClientRect();
    const rx = (px-r.left)/r.width*100;
    const ry = (py-r.top)/r.height*100;
    const prx= (ppx-r.left)/r.width*100;
    const pry= (ppy-r.top)/r.height*100;
 
    // add trail seg
    trailSegs.current.push({id:sid(),x1:prx,y1:pry,x2:rx,y2:ry,age:0});
 
    setItems(arr=>{
      let hit=false;
      const next=arr.map(it=>{
        if(it.sliced) return it;
        const dx=rx-it.x, dy=ry-it.y;
        const dist=Math.hypot(dx,dy);
        const threshold=it.kind==="final"?12:8;
        if(dist>threshold) return it;
 
        hit=true;
        const meta=META[it.kind];
 
        // sparks
        const colors=it.kind==="bad"?["#ef4444","#fca5a5","#fff"]:it.kind==="star"?["#fde047","#f59e0b","#fff"]:it.kind==="diploma"?["#f0b84a","#d4922a","#fff"]:["#60a5fa","#93c5fd","#fff"];
        const newSparks:Spark[]=Array.from({length:it.kind==="final"?20:10}).map(()=>({
          id:sid(),x:rx,y:ry,
          vx:(Math.random()-0.5)*4,vy:-(1+Math.random()*3),
          color:colors[Math.floor(Math.random()*colors.length)],
          life:18+Math.random()*14,
        }));
        setSparks(s=>[...s,...newSparks]);
 
        if(it.kind==="bad"){
          comboRef.current=0; setCombo(0);
          setMeter(m=>Math.max(0,m-2)); meterRef.current=Math.max(0,meterRef.current-2);
          setBgPulse(true); setTimeout(()=>setBgPulse(false),300);
          addPopup(rx,ry,"-2 💀","#ef4444");
          play("click");
        } else {
          comboRef.current++;
          const c=comboRef.current; setCombo(c);
          if(comboTimer.current) clearTimeout(comboTimer.current);
          comboTimer.current=setTimeout(()=>{comboRef.current=0;setCombo(0);},1300);
          const bonus=c>=3?Math.ceil(meta.pts*(1+c*0.5)):meta.pts;
          const newM=Math.min(GOAL,meterRef.current+bonus);
          meterRef.current=newM; setMeter(newM);
          play(it.kind==="final"||it.kind==="star"?"gold":"coin");
          addPopup(rx,ry,c>=3?`+${bonus} ×${c}!`:`+${bonus} ${meta.emoji}`,meta.glow);
          if(it.kind==="final"&&!wonRef.current){
            wonRef.current=true; setWon(true); play("win");
            setTimeout(()=>onCompleteRef.current(),1400);
          }
        }
        return {...it,sliced:true,slicedAt:Date.now()};
      });
      if(hit) play("slice");
      return next;
    });
 
    function addPopup(x:number,y:number,text:string,color:string){
      const pid=sid();
      setPopups(p=>[...p,{id:pid,x,y,text,color}]);
      setTimeout(()=>setPopups(p=>p.filter(q=>q.id!==pid)),800);
    }
  },[play]);
 
  const toRel=(e:{clientX:number;clientY:number})=>{
    if(!containerRef.current) return {x:0,y:0};
    const r=containerRef.current.getBoundingClientRect();
    return {x:e.clientX-r.left,y:e.clientY-r.top};
  };
 
  const onPointerDown=(e:React.PointerEvent)=>{
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointer.current={x:e.clientX,y:e.clientY};
    prevPointer.current={x:e.clientX,y:e.clientY};
  };
  const onPointerMove=(e:React.PointerEvent)=>{
    if(!pointer.current) return;
    hitTest(e.clientX,e.clientY,pointer.current.x,pointer.current.y);
    prevPointer.current=pointer.current;
    pointer.current={x:e.clientX,y:e.clientY};
  };
  const onPointerUp=()=>{ pointer.current=null; prevPointer.current=null; };
 
  const meterPct=(meter/GOAL)*100;
 
  return (
    <section className="page-bg" style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", padding:"72px 12px 16px" }}>
 
      {/* Header row */}
      <div style={{ width:"100%", maxWidth:480, marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <p className="label-caps">Challenge 3 · 3</p>
          <h2 className="display" style={{ fontSize:"1.6rem", color:"var(--ink)", lineHeight:1.1 }}>Slice Rush</h2>
        </div>
        {combo>=2&&(
          <div style={{ background:combo>=5?"var(--gold)":combo>=3?"#f97316":"#3b82f6", color:"#fff", borderRadius:999, padding:"4px 14px", fontSize:"0.72rem", fontWeight:900, boxShadow:`0 3px 0 ${combo>=5?"#a06018":combo>=3?"#c2410c":"#1d4ed8"}`, animation:"scale-in 0.2s ease both" }}>
            ×{combo}{combo>=5?" 🔥":combo>=3?" ⚡":""}
          </div>
        )}
      </div>
 
      {/* Meter */}
      <div style={{ width:"100%", maxWidth:480, marginBottom:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
          <span style={{ fontSize:"0.68rem", fontWeight:800, color:"var(--ink-3)" }}>✂️ Slice meter</span>
          <span style={{ fontSize:"0.68rem", fontWeight:800, color:"var(--gold)" }}>{meter} / {GOAL}</span>
        </div>
        <div style={{ height:14, background:"var(--bg-muted)", border:"2px solid var(--border-soft)", borderRadius:999, overflow:"hidden", position:"relative" }}>
          <div style={{ height:"100%", width:`${meterPct}%`, background:"linear-gradient(90deg,#f0b84a,#d4922a)", borderRadius:999, transition:"width 0.2s cubic-bezier(0.34,1.56,0.64,1)", boxShadow:"0 0 10px rgb(212 146 42/0.5)", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)", backgroundSize:"200% 100%", animation:"shimmer 1.2s linear infinite" }}/>
          </div>
          {[25,50,75].map(m=>(
            <div key={m} style={{ position:"absolute", top:0, bottom:0, left:`${m}%`, width:2, background:meterPct>=m?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.07)", borderRadius:1 }}/>
          ))}
        </div>
      </div>
 
      {/* Arena */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        style={{
          position:"relative", width:"100%", maxWidth:480,
          height:"min(62vh,520px)", borderRadius:22, overflow:"hidden",
          cursor:"crosshair", userSelect:"none", touchAction:"none", flexShrink:0,
          boxShadow:"0 12px 40px rgb(42 33 24/0.18), 0 4px 0 var(--border)",
          border:"2px solid var(--border-soft)",
          outline: bgPulse?"3px solid #ef4444":"3px solid transparent",
          transition:"outline 0.1s, background 0.2s",
        }}
      >
        {/* Background */}
        <div style={{ position:"absolute", inset:0, background: bgPulse?"linear-gradient(135deg,#fff1f2,#ffe4e6)":"linear-gradient(135deg,#fefce8 0%,#fffde7 40%,#f0f9ff 100%)", transition:"background 0.2s" }}/>
        {/* Subtle grid */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle,#e8e0cc 1px,transparent 1px)", backgroundSize:"28px 28px", opacity:0.5 }}/>
        {/* Radial vignette */}
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at center,transparent 50%,rgba(42,33,24,0.06) 100%)" }}/>
 
        {/* Canvas trail */}
        <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}/>
 
        {/* Sparks */}
        {sparks.map(s=>(
          <div key={s.id} style={{ position:"absolute", left:`${s.x}%`, top:`${s.y}%`, width:s.life>10?5:3, height:s.life>10?5:3, borderRadius:"50%", background:s.color, transform:"translate(-50%,-50%)", pointerEvents:"none", opacity:Math.min(1,s.life/12), boxShadow:`0 0 4px ${s.color}` }}/>
        ))}
 
        {/* Items */}
        {items.map(it=>{
          const meta=META[it.kind];
          const sz = it.kind==="final"?72:it.kind==="bad"?46:52;
          const shadow = it.sliced?`0 0 30px ${meta.glow}`:`0 6px 0 rgba(0,0,0,0.15), 0 0 20px ${meta.glow}55`;
          return (
            <div key={it.id} style={{
              position:"absolute",
              left:`${it.x}%`, top:`${it.y}%`,
              transform:`translate(-50%,-50%) rotate(${it.rot}deg) scale(${it.sliced?1.4:it.scale})`,
              opacity: it.sliced?0:1,
              transition: it.sliced?"transform 0.15s ease,opacity 0.2s ease":"none",
              pointerEvents:"none",
              fontSize: sz,
              lineHeight:1,
              filter: it.sliced?`blur(2px) drop-shadow(0 0 12px ${meta.glow})`:`drop-shadow(0 4px 0 rgba(0,0,0,0.18)) drop-shadow(0 0 8px ${meta.glow}88)`,
            }}>
              {it.kind==="final"&&!it.sliced&&(
                <div style={{ position:"absolute", inset:-14, borderRadius:"50%", border:"3px solid var(--gold)", boxShadow:"0 0 20px var(--gold), inset 0 0 12px rgba(212,146,42,0.2)", animation:"pulse-soft 0.8s ease-in-out infinite" }}/>
              )}
              {meta.emoji}
            </div>
          );
        })}
 
        {/* Score popups */}
        {popups.map(p=>(
          <div key={p.id} style={{ position:"absolute", left:`${p.x}%`, top:`${p.y}%`, transform:"translate(-50%,-50%)", pointerEvents:"none", fontSize:"1.1rem", fontWeight:900, fontFamily:"'Nunito',sans-serif", color:p.color, whiteSpace:"nowrap", textShadow:"0 2px 8px rgba(0,0,0,0.15)", animation:"pop-up 0.8s cubic-bezier(0.22,1,0.36,1) both" }}>
            {p.text}
          </div>
        ))}
 
        {/* Idle hint */}
        {items.length===0&&!won&&(
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none", gap:8 }}>
            <div style={{ fontSize:48 }}>✂️</div>
            <p style={{ fontSize:"0.8rem", fontWeight:800, color:"var(--ink-3)", animation:"pulse-soft 2s ease-in-out infinite" }}>Swipe to slice items!</p>
            <div style={{ display:"flex", gap:12, marginTop:4 }}>
              {(["🎓+1","📜+2","⭐+3","💀-2"] as const).map(t=>(
                <span key={t} style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--ink-4)" }}>{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
 
      {won && <WinBanner label="Slice Rush Complete! ✂️"/>}
    </section>
  );
}