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

  const onTouchStart=(e:React.TouchEvent)=>{
    touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
  };
  const onTouchEnd=(e:React.TouchEvent)=>{
    if(!touchStart.current) return;
    const dx=e.changedTouches[0].clientX-touchStart.current.x;
    const dy=e.changedTouches[0].clientY-touchStart.current.y;
    if(Math.abs(dx)<18&&Math.abs(dy)<18) return;
    if(Math.abs(dx)>Math.abs(dy)) move(dx>0?"E":"W"); else move(dy>0?"S":"N");
    touchStart.current=null;
  };

  // Cell size in px — calculated client-side via CSS custom property trick
  // Icons need a fixed px size; we use 40% of cell which at 9 cols in ~360px board = ~16px
  const ICON_SIZE = 14;
  const GOAL_ICON = 12;

  return (
    <section
      className="page-bg"
      style={{
        minHeight:"100dvh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        gap:16, padding:"72px 16px 24px",
        boxSizing:"border-box",
      }}
    >
      {/* Header */}
      <header style={{ textAlign:"center", flexShrink:0 }}>
        <p className="label-caps" style={{ marginBottom:4 }}>Challenge 1 · 3</p>
        <h2 className="display" style={{ fontSize:"clamp(1.5rem,5vw,1.9rem)", color:"var(--ink)" }}>Graduation Maze</h2>
        <p style={{ marginTop:4, fontSize:"0.72rem", color:"var(--ink-3)" }}>
          Guide 🎓 to the diploma · Swipe the board or use the d-pad
        </p>
      </header>

      {/* Maze board — square, fills available width, never overflows */}
      <div
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{
          flexShrink:0,
          position:"relative",
          /* square: take full width up to 420px, but leave room for header + dpad + padding */
          width:"min(calc(100vw - 32px), calc(100dvh - 280px), 420px)",
          aspectRatio:"1 / 1",
          background:"var(--bg-card)",
          border:"2px solid var(--border-soft)",
          borderRadius:20,
          padding:8,
          boxShadow:"var(--shadow-lg)",
          touchAction:"none",
          overflow:"hidden",
        }}
      >
        {/* Inner grid container */}
        <div style={{
          position:"relative",
          width:"100%", height:"100%",
          borderRadius:12,
          background:"#f9f5ec",
          overflow:"hidden",
        }}>
          {/* Grid cells — walls only, no content */}
          <div style={{
            display:"grid",
            gridTemplateColumns:`repeat(${COLS},1fr)`,
            gridTemplateRows:`repeat(${ROWS},1fr)`,
            width:"100%", height:"100%",
          }}>
            {grid.flat().map(cell=>{
              const isGoal = cell.r===goal.r && cell.c===goal.c;
              const wc = isGoal ? "#e8b84b" : "#d8ccb4";
              return (
                <div key={`${cell.r}-${cell.c}`} style={{
                  borderTop:    cell.walls.N ? `1.5px solid ${wc}` : "none",
                  borderBottom: cell.walls.S ? `1.5px solid ${wc}` : "none",
                  borderLeft:   cell.walls.W ? `1.5px solid ${wc}` : "none",
                  borderRight:  cell.walls.E ? `1.5px solid ${wc}` : "none",
                  background:   isGoal ? "#fff3d0" : "transparent",
                }} />
              );
            })}
          </div>

          {/* Goal token — positioned as % so it stays inside */}
          <div style={{
            position:"absolute",
            pointerEvents:"none",
            width:`${100/COLS}%`,
            height:`${100/ROWS}%`,
            left:`${goal.c*(100/COLS)}%`,
            top:`${goal.r*(100/ROWS)}%`,
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
          }}>
            <div style={{
              width:"72%", height:"72%",
              borderRadius:"50%",
              background:"var(--gold)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 0 10px rgb(212 146 42/0.55)",
              animation:"pulse-soft 2s ease-in-out infinite",
              overflow:"hidden",
            }}>
              <ScrollText size={GOAL_ICON} color="#fff" strokeWidth={2.5} />
            </div>
          </div>

          {/* Player token */}
          <div style={{
            position:"absolute",
            pointerEvents:"none",
            width:`${100/COLS}%`,
            height:`${100/ROWS}%`,
            left:`${pos.c*(100/COLS)}%`,
            top:`${pos.r*(100/ROWS)}%`,
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            transition:"left 0.15s cubic-bezier(0.22,1,0.36,1), top 0.15s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <div style={{
              width:"74%", height:"74%",
              borderRadius:"50%",
              background: won ? "var(--gold)" : "var(--sky)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:`0 0 10px ${won?"rgb(212 146 42/0.6)":"rgb(59 130 246/0.5)"}`,
              transform: won ? "scale(1.2)" : "scale(1)",
              transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              overflow:"hidden",
            }}>
              <GraduationCap size={ICON_SIZE} color="#fff" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>

      {/* D-pad — proper 3×3 cross layout */}
      <div style={{
        flexShrink:0,
        display:"grid",
        gridTemplateColumns:"repeat(3, 52px)",
        gridTemplateRows:"repeat(3, 52px)",
        gap:4,
      }}>
        {/* Row 0 */}
        <span />
        <DBtn onClick={()=>move("N")} label="Up"><ChevronUp size={20}/></DBtn>
        <span />
        {/* Row 1 */}
        <DBtn onClick={()=>move("W")} label="Left"><ChevronLeft size={20}/></DBtn>
        {/* Center — decorative dot */}
        <div style={{ borderRadius:12, background:"var(--bg-muted)", border:"1.5px solid var(--border)", display:"grid", placeItems:"center" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--border)" }}/>
        </div>
        <DBtn onClick={()=>move("E")} label="Right"><ChevronRight size={20}/></DBtn>
        {/* Row 2 */}
        <span />
        <DBtn onClick={()=>move("S")} label="Down"><ChevronDown size={20}/></DBtn>
        <span />
      </div>

      {won && <WinBanner label="Maze Complete! 🎓" />}
    </section>
  );
}

function DBtn({ children, onClick, label }: { children: React.ReactNode; onClick: ()=>void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="btn-game"
      style={{ width:52, height:52, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center" }}
    >
      {children}
    </button>
  );
}
