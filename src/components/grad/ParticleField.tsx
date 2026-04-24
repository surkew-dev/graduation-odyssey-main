import { useMemo } from "react";

export function ParticleField({ count = 14 }: { count?: number }) {
  const particles = useMemo(()=>
    Array.from({length:count}).map((_,i)=>({
      id:i, size:2+Math.random()*3, left:Math.random()*100,
      delay:Math.random()*8, dur:10+Math.random()*12, opacity:0.3+Math.random()*0.4,
    })),[count]);

  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", overflow:"hidden", zIndex:0 }} aria-hidden>
      {particles.map(p=>(
        <span key={p.id} style={{
          position:"absolute", left:`${p.left}%`, bottom:-4,
          width:p.size, height:p.size, borderRadius:"50%",
          background:"radial-gradient(circle,#f0b84a 0%,rgb(212 146 42/0.3) 70%,transparent 100%)",
          opacity:p.opacity,
          animation:`float-up ${p.dur}s ease ${p.delay}s infinite`,
        }}/>
      ))}
    </div>
  );
}
