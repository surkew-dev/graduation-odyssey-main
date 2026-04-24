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
 
  // Measure the actual rendered inner canvas size in pixels
  const canvasRef = useRef<SVGSVGElement>(null);
  const [canvasPx, setCanvasPx] = useState(300);
 
  useEffect(()=>{
    const measure = () => {
      if (canvasRef.current) {
        setCanvasPx(canvasRef.current.clientWidth);
      }
    };
    measure();
    // small delay to let layout settle
    const t = setTimeout(measure, 50);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, []);
 
  const cell = canvasPx / COLS; // exact px per cell
 
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
 
  // Token: 60% of cell, centered in cell
  const tokenR  = cell * 0.30; // radius
  const tokenCx = (c:number) => c * cell + cell / 2;
  const tokenCy = (r:number) => r * cell + cell / 2;
  const fontSize = Math.max(10, Math.floor(cell * 0.34));
 
  // Wall thickness: fixed 2px regardless of board size
  const WALL = 2;
  const WALL_COLOR = "#c8b896";
  const GOAL_WALL  = "#d4a22a";
 
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
 
      {/* Board wrapper — square, fits viewport */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          flexShrink:0,
          position:"relative",
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
          Single SVG covers the full inner area.
          viewBox matches clientWidth × clientHeight (square).
          All coordinates are in real pixels — walls are exactly 2px thick.
          Tokens are circles centered precisely in each cell.
          No clipping needed.
        */}
        <svg
          ref={canvasRef}
          style={{ display:"block", width:"100%", height:"100%", borderRadius:10 }}
          viewBox={`0 0 ${canvasPx} ${canvasPx}`}
          shapeRendering="crispEdges"
        >
          {/* Background */}
          <rect width={canvasPx} height={canvasPx} fill="#f9f5ec" rx={10}/>
 
          {/* Goal cell tint */}
          <rect
            x={goal.c * cell} y={goal.r * cell}
            width={cell} height={cell}
            fill="#fff3d0"
          />
 
          {/* ── Walls ── each wall is a line at exact pixel boundary */}
          {grid.flat().map(({ r, c, walls }) => {
            const isGoal = r===goal.r && c===goal.c;
            const wc = isGoal ? GOAL_WALL : WALL_COLOR;
            const x0 = c * cell, y0 = r * cell;
            const x1 = x0 + cell, y1 = y0 + cell;
            return (
              <g key={`${r}-${c}`}>
                {walls.N && <line x1={x0} y1={y0} x2={x1} y2={y0} stroke={wc} strokeWidth={WALL} strokeLinecap="square"/>}
                {walls.S && <line x1={x0} y1={y1} x2={x1} y2={y1} stroke={wc} strokeWidth={WALL} strokeLinecap="square"/>}
                {walls.W && <line x1={x0} y1={y0} x2={x0} y2={y1} stroke={wc} strokeWidth={WALL} strokeLinecap="square"/>}
                {walls.E && <line x1={x1} y1={y0} x2={x1} y2={y1} stroke={wc} strokeWidth={WALL} strokeLinecap="square"/>}
              </g>
            );
          })}
 
          {/* ── Goal token ── */}
          <circle
            cx={tokenCx(goal.c)} cy={tokenCy(goal.r)}
            r={tokenR}
            fill="#d4922a"
          />
          <text
            x={tokenCx(goal.c)} y={tokenCy(goal.r)}
            textAnchor="middle" dominantBaseline="central"
            fontSize={fontSize} style={{ userSelect:"none" }}
          >📜</text>
 
          {/* ── Player token ── */}
          <circle
            cx={tokenCx(pos.c)} cy={tokenCy(pos.r)}
            r={tokenR}
            fill={won ? "#d4922a" : "#3b82f6"}
            style={{ transition:"cx 0.15s cubic-bezier(0.22,1,0.36,1), cy 0.15s cubic-bezier(0.22,1,0.36,1)" }}
          />
          <text
            x={tokenCx(pos.c)} y={tokenCy(pos.r)}
            textAnchor="middle" dominantBaseline="central"
            fontSize={fontSize} style={{ userSelect:"none", pointerEvents:"none" }}
          >🎓</text>
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