import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSfx } from "./AudioProvider";
import { WinBanner } from "./WinBanner";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
 
interface MazeGameProps { onComplete: () => void }
const ROWS = 9, COLS = 9;
type Dir = "N"|"S"|"E"|"W";
type Cell = { r:number; c:number; walls:{ N:boolean;S:boolean;E:boolean;W:boolean } };
 
function generateMaze(rows:number, cols:number): Cell[][] {
  const grid:Cell[][] = Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>({r,c,walls:{N:true,S:true,E:true,W:true}})));
  const visited = Array.from({length:rows},()=>Array(cols).fill(false));
  const stack:Cell[] = [grid[0][0]];
  visited[0][0] = true;
  const dirs = [{dr:-1,dc:0,w:"N" as Dir,o:"S" as Dir},{dr:1,dc:0,w:"S" as Dir,o:"N" as Dir},{dr:0,dc:1,w:"E" as Dir,o:"W" as Dir},{dr:0,dc:-1,w:"W" as Dir,o:"E" as Dir}];
  while (stack.length) {
    const cur = stack[stack.length-1];
    const nbrs = dirs.map(d=>({...d,nr:cur.r+d.dr,nc:cur.c+d.dc})).filter(n=>n.nr>=0&&n.nr<rows&&n.nc>=0&&n.nc<cols&&!visited[n.nr][n.nc]);
    if (!nbrs.length){stack.pop();continue;}
    const n = nbrs[Math.floor(Math.random()*nbrs.length)];
    cur.walls[n.w]=false; grid[n.nr][n.nc].walls[n.o]=false;
    visited[n.nr][n.nc]=true; stack.push(grid[n.nr][n.nc]);
  }
  return grid;
}
 
export function MazeGame({ onComplete }: MazeGameProps) {
  const { play } = useSfx();
  const grid = useMemo(()=>generateMaze(ROWS,COLS),[]);
  const [pos, setPos] = useState({r:0,c:0});
  const [won, setWon] = useState(false);
  const wonRef = useRef(false);
  const goal = useMemo(()=>({r:ROWS-1,c:COLS-1}),[]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const touchStart = useRef<{x:number;y:number}|null>(null);
 
  const move = useCallback((dir:Dir)=>{
    if (wonRef.current) return;
    setPos(p=>{
      const c = grid[p.r][p.c];
      if (c.walls[dir]) return p;
      const np = {...p};
      if (dir==="N") np.r--; if (dir==="S") np.r++;
      if (dir==="E") np.c++; if (dir==="W") np.c--;
      play("step");
      return np;
    });
  },[grid,play]);
 
  useEffect(()=>{
    if (pos.r===goal.r && pos.c===goal.c && !wonRef.current) {
      wonRef.current=true; setWon(true); play("win");
      setTimeout(()=>onCompleteRef.current(), 1700);
    }
  },[pos,goal,play]);
 
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase();
      if(["arrowup","w"].includes(k)){e.preventDefault();move("N");}
      else if(["arrowdown","s"].includes(k)){e.preventDefault();move("S");}
      else if(["arrowleft","a"].includes(k)){e.preventDefault();move("W");}
      else if(["arrowright","d"].includes(k)){e.preventDefault();move("E");}
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[move]);
 
  const onTouchStart=(e:React.TouchEvent)=>{
    touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
  };
  const onTouchEnd=(e:React.TouchEvent)=>{
    if(!touchStart.current) return;
    const dx=e.changedTouches[0].clientX-touchStart.current.x;
    const dy=e.changedTouches[0].clientY-touchStart.current.y;
    if(Math.abs(dx)<14&&Math.abs(dy)<14) return;
    if(Math.abs(dx)>Math.abs(dy)) move(dx>0?"E":"W"); else move(dy>0?"S":"N");
    touchStart.current=null;
  };
 
  // SVG viewBox is COLS × ROWS — 1 unit = 1 cell
  // strokeWidth in these units: 0.05 = thin crisp lines at any size
  const SW = 0.05;
  const WC = "#cec0a4";
  const GWC = "#d4a030";
 
  // Token radius: 0.3 units (leaves ~0.2 gap each side inside 1-unit cell)
  const TR = 0.30;
 
  return (
    <section
      className="page-bg"
      style={{
        minHeight:"100dvh",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        gap:14, padding:"70px 16px 20px",
        boxSizing:"border-box",
      }}
    >
      <header style={{ textAlign:"center", flexShrink:0 }}>
        <p className="label-caps" style={{ marginBottom:4 }}>Challenge 1 · 3</p>
        <h2 className="display" style={{ fontSize:"clamp(1.4rem,5vw,1.8rem)", color:"var(--ink)" }}>
          Graduation Maze
        </h2>
        <p style={{ marginTop:3, fontSize:"0.7rem", color:"var(--ink-3)" }}>
          Swipe the maze or use the d-pad below
        </p>
      </header>
 
      {/* Board — square, fits screen */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          flexShrink:0,
          width:"min(calc(100vw - 32px), calc(100dvh - 264px), 400px)",
          aspectRatio:"1 / 1",
          background:"var(--bg-card)",
          border:"2px solid var(--border-soft)",
          borderRadius:18,
          padding:6,
          boxShadow:"var(--shadow-lg)",
          touchAction:"none",
          boxSizing:"border-box",
        }}
      >
        {/*
          viewBox="0 0 9 9" — each cell is exactly 1×1 unit.
          preserveAspectRatio="xMidYMid meet" (default) keeps it square.
          strokeWidth=0.05 stays thin at any rendered size.
          Token circles are centered at (col+0.5, row+0.5) — always mid-cell.
          The SVG fills 100% of the padded inner area, no overflow possible.
        */}
        <svg
          viewBox={`0 0 ${COLS} ${ROWS}`}
          style={{ display:"block", width:"100%", height:"100%", borderRadius:10 }}
        >
          {/* Background */}
          <rect width={COLS} height={ROWS} fill="#f9f5ec" rx={0.3}/>
 
          {/* Goal cell highlight */}
          <rect x={goal.c} y={goal.r} width={1} height={1} fill="#fff3d0"/>
 
          {/* Walls */}
          {grid.flat().map(({ r, c, walls }) => {
            const isGoal = r===goal.r && c===goal.c;
            const wc = isGoal ? GWC : WC;
            return (
              <g key={`${r}-${c}`}>
                {walls.N && <line x1={c}   y1={r}   x2={c+1} y2={r}   stroke={wc} strokeWidth={SW} strokeLinecap="square"/>}
                {walls.S && <line x1={c}   y1={r+1} x2={c+1} y2={r+1} stroke={wc} strokeWidth={SW} strokeLinecap="square"/>}
                {walls.W && <line x1={c}   y1={r}   x2={c}   y2={r+1} stroke={wc} strokeWidth={SW} strokeLinecap="square"/>}
                {walls.E && <line x1={c+1} y1={r}   x2={c+1} y2={r+1} stroke={wc} strokeWidth={SW} strokeLinecap="square"/>}
              </g>
            );
          })}
 
          {/* Goal token — centered in cell, never clips because circle fits within 1 unit */}
          <circle cx={goal.c + 0.5} cy={goal.r + 0.5} r={TR} fill="#d4922a"/>
          <text
            x={goal.c + 0.5} y={goal.r + 0.5}
            textAnchor="middle" dominantBaseline="central"
            fontSize={0.38} style={{ userSelect:"none" }}
          >📜</text>
 
          {/* Player token — CSS transition on the SVG <g> transform */}
          <g
            transform={`translate(${pos.c + 0.5}, ${pos.r + 0.5})`}
            style={{ transition:"transform 0.15s cubic-bezier(0.22,1,0.36,1)" }}
          >
            <circle cx={0} cy={0} r={TR} fill={won ? "#d4922a" : "#3b82f6"}/>
            <text
              x={0} y={0}
              textAnchor="middle" dominantBaseline="central"
              fontSize={0.38} style={{ userSelect:"none", pointerEvents:"none" }}
            >🎓</text>
          </g>
        </svg>
      </div>
 
      {/* D-pad */}
      <div style={{
        flexShrink:0,
        display:"grid",
        gridTemplateColumns:"repeat(3, 50px)",
        gridTemplateRows:"repeat(3, 50px)",
        gap:5,
      }}>
        <span/>
        <DBtn onClick={()=>move("N")} label="Up"><ChevronUp size={22}/></DBtn>
        <span/>
        <DBtn onClick={()=>move("W")} label="Left"><ChevronLeft size={22}/></DBtn>
        <div style={{ borderRadius:13, background:"var(--bg-muted)", border:"1.5px solid var(--border-soft)", display:"grid", placeItems:"center" }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"var(--border)" }}/>
        </div>
        <DBtn onClick={()=>move("E")} label="Right"><ChevronRight size={22}/></DBtn>
        <span/>
        <DBtn onClick={()=>move("S")} label="Down"><ChevronDown size={22}/></DBtn>
        <span/>
      </div>
 
      {won && <WinBanner label="Maze Complete! 🎓"/>}
    </section>
  );
}
 
function DBtn({ children, onClick, label }: { children:React.ReactNode; onClick:()=>void; label:string }) {
  return (
    <button onClick={onClick} aria-label={label} className="btn-game"
      style={{ width:50, height:50, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center" }}>
      {children}
    </button>
  );
}
 