import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GraduationCap, ScrollText, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useSfx } from "./AudioProvider";
import { WinBanner } from "./WinBanner";

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
      const cell = grid[p.r][p.c];
      if (cell.walls[dir]) return p;
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

  const onTouchStart=(e:React.TouchEvent)=>{ touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY}; };
  const onTouchEnd=(e:React.TouchEvent)=>{
    if(!touchStart.current) return;
    const dx=e.changedTouches[0].clientX-touchStart.current.x;
    const dy=e.changedTouches[0].clientY-touchStart.current.y;
    if(Math.abs(dx)<18&&Math.abs(dy)<18) return;
    if(Math.abs(dx)>Math.abs(dy)) move(dx>0?"E":"W"); else move(dy>0?"S":"N");
    touchStart.current=null;
  };

  return (
    <section className="page-bg" style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, padding:"80px 16px 32px" }}>

      <header style={{ textAlign:"center" }}>
        <p className="label-caps" style={{ marginBottom:6 }}>Challenge 1 · 3</p>
        <h2 className="display" style={{ fontSize:"1.9rem", color:"var(--ink)" }}>Graduation Maze</h2>
        <p style={{ marginTop:4, fontSize:"0.75rem", color:"var(--ink-3)" }}>Guide the cap to the diploma · Swipe or use arrow keys</p>
      </header>

      {/* Maze board */}
      <div
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ position:"relative", width:"100%", maxWidth:"min(90vw,420px)", aspectRatio:"1", background:"var(--bg-card)", border:"2px solid var(--border-soft)", borderRadius:20, padding:10, boxShadow:"var(--shadow-lg)", touchAction:"none" }}
      >
        <div style={{ position:"relative", width:"100%", height:"100%", borderRadius:12, overflow:"hidden", background:"#f9f5ec" }}>
          {/* Grid cells */}
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${COLS},1fr)`, gridTemplateRows:`repeat(${ROWS},1fr)`, width:"100%", height:"100%" }}>
            {grid.flat().map(cell=>{
              const isGoal = cell.r===goal.r && cell.c===goal.c;
              const wc = isGoal ? "#f0c860" : "#ddd4be";
              return (
                <div key={`${cell.r}-${cell.c}`} style={{
                  borderTop:    cell.walls.N ? `1.5px solid ${wc}` : "none",
                  borderBottom: cell.walls.S ? `1.5px solid ${wc}` : "none",
                  borderLeft:   cell.walls.W ? `1.5px solid ${wc}` : "none",
                  borderRight:  cell.walls.E ? `1.5px solid ${wc}` : "none",
                  background:   isGoal ? "#fff8e6" : "transparent",
                }} />
              );
            })}
          </div>

          {/* Goal */}
          <div style={{ position:"absolute", pointerEvents:"none", width:`${100/COLS}%`, height:`${100/ROWS}%`, left:`${goal.c*100/COLS}%`, top:`${goal.r*100/ROWS}%`, display:"grid", placeItems:"center" }}>
            <div style={{ width:"68%", height:"68%", borderRadius:"50%", background:"var(--gold)", display:"grid", placeItems:"center", boxShadow:"0 0 14px rgb(212 146 42/0.5)", animation:"pulse-soft 2s ease-in-out infinite" }}>
              <ScrollText size="45%" color="#fff" />
            </div>
          </div>

          {/* Player */}
          <div style={{ position:"absolute", pointerEvents:"none", width:`${100/COLS}%`, height:`${100/ROWS}%`, left:`${pos.c*100/COLS}%`, top:`${pos.r*100/ROWS}%`, display:"grid", placeItems:"center", transition:"left 0.16s cubic-bezier(0.22,1,0.36,1), top 0.16s cubic-bezier(0.22,1,0.36,1)" }}>
            <div style={{ width:"70%", height:"70%", borderRadius:"50%", background:won?"var(--gold)":"var(--sky)", display:"grid", placeItems:"center", boxShadow:`0 0 14px ${won?"rgb(212 146 42/0.6)":"rgb(59 130 246/0.5)"}`, transform:won?"scale(1.25)":"scale(1)", transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
              <GraduationCap size="58%" color="#fff" />
            </div>
          </div>
        </div>
      </div>

      {/* D-pad */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,48px)", gridTemplateRows:"repeat(2,48px)", gap:6 }}>
        <span/><DBtn onClick={()=>move("N")}><ChevronUp size={18}/></DBtn><span/>
        <DBtn onClick={()=>move("W")}><ChevronLeft size={18}/></DBtn>
        <DBtn onClick={()=>move("S")}><ChevronDown size={18}/></DBtn>
        <DBtn onClick={()=>move("E")}><ChevronRight size={18}/></DBtn>
      </div>

      {won && <WinBanner label="Maze Complete!" />}
    </section>
  );
}

function DBtn({children,onClick}:{children:React.ReactNode;onClick:()=>void}) {
  return (
    <button onClick={onClick} className="btn-game" style={{ width:48, height:48 }}>
      {children}
    </button>
  );
}
