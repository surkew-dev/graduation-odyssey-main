
# Premium Graduation Invitation — Interactive Mini-Game Experience

A cinematic, mobile-first single-page experience where guests beat 3 polished mini-games to unlock an elegant graduation invitation. Light masculine futuristic aesthetic with glassmorphism, ice white / silver / sky blue / royal blue / navy palette and tiny gold reward sparkles.

## Global shell
- **Scene manager** that smoothly cross-fades between: Landing → Game 1 → Interlude → Game 2 → Interlude → Game 3 → Final Unlock.
- **Top HUD (persistent during games):** progress dots `1/3 · 2/3 · 3/3`, sound toggle (🔊/🔇), subtle frosted-glass bar.
- **Background:** soft animated gradient (ice white → pale sky blue) with slow-drifting particles and faint grid lines for a futuristic feel.
- **Audio:** Web Audio API generates clicks, swooshes, slices, win chimes and confetti pops. No external assets. Toggle persists in localStorage.
- **Difficulty:** easy & forgiving across all games — no fail-out, no game over screens, just keep playing until the win condition fires.

## Landing scene
- Centered glass card with thin silver border and soft glow.
- Headline: *"You're Invited"*. Sub: *"Complete 3 challenges to unlock my graduation invitation."*
- Three numbered chips previewing the games (Maze · Run · Slice).
- Large pill **Start** button with breathing glow + shimmer sweep.
- Gold sparkle particles drift upward subtly.

## Game 1 — Graduation Maze Escape
- Top-down grid maze (~10×10), generated but always solvable; small enough for mobile.
- Player = glowing graduation cap; goal = diploma scroll with golden halo.
- **Controls:** swipe on mobile, arrow keys / WASD on desktop, on-screen D-pad fallback.
- Smooth tweened movement between cells, trailing light ribbon behind the cap.
- Walls in navy with sky-blue inner glow; floor in ice white.
- On reach: cap lifts, diploma bursts gold particles, banner *"Challenge 1 Complete"* slides in.
- **Forgiving:** no timer, no enemies — pure puzzle stroll.

## Interlude transition
- Quick cinematic wipe with a thin gold line sweeping across, scene name fades in/out (*"Campus Run"*), progress dot fills.

## Game 2 — Campus Run (endless runner)
- 3-lane perspective track receding into a soft horizon. Parallax campus silhouettes (library, clock tower) in pale blue.
- **Player:** stylized graduate avatar in center, casting soft shadow.
- **Controls:** swipe left/right (lane change), swipe up (jump), swipe down (slide). Desktop: arrow keys. Tap zones on screen as fallback.
- **Obstacles:** floating "EXAM" papers, "DEADLINE" clocks, coffee spill puddles — clean iconographic style, not cluttered.
- **Pickups:** silver credit coins (+1) and rare gold diploma tokens (+5) with a pleasing chime.
- **Goal:** fill progress bar to **100 credits**. Bar at top with gold fill and shimmer.
- Speed ramps gently; collisions just briefly dim the avatar and cost nothing (forgiving mode).
- On 100: track freezes, graduate leaps, *"Challenge 2 Complete"* banner.

## Game 3 — Slice Rush
- Full-screen slicing canvas with soft vignette.
- **Throwables:** graduation caps, diplomas, gold stars (good) — failed exam papers with red tint (bad, just ignore them, no penalty in easy mode, only missed combo).
- **Controls:** pointer/touch drag leaves a glowing silver-blue blade trail; objects sliced along the path split into halves with particle burst.
- **Combo system:** slicing 3+ in one swipe triggers gold "COMBO ×N" popup and bonus meter fill.
- **Graduation meter** on the side fills with each good slice.
- On full meter: a single oversized **golden diploma** floats up in slow-mo with radiant glow. Slicing it triggers the unlock.

## Final Unlock scene
- Screen "cuts open" along the slice line — two halves part to reveal what's behind.
- Confetti (gold + sky blue + silver) cascades from the top with physics.
- Centerpiece: elegant glass invitation card with thin gold border, subtle floating animation.
- **Card content (placeholders, easy to edit later):**
  - Monogram seal at top
  - *"You are cordially invited to celebrate the graduation of"*
  - **[Graduate Name]**
  - Degree · Institution
  - Date · Time · Venue
  - Dress code line
  - Two ghost buttons: *Add to Calendar* (generates .ics) and *Share*
- Soft ambient sparkle loop continues. Replay button to revisit the games.

## Polish details
- Every button: glass surface, inner highlight, soft drop shadow, hover lift + shimmer, satisfying click SFX.
- Win banners use scale-in + fade-in with a gold underline sweep.
- Score popups (+1, +5, COMBO) tween up and fade.
- All scenes mobile-first; layouts scale gracefully to desktop (max-width centered stage with ambient background filling the rest).
- Reduced-motion preference respected (disables parallax/particles, keeps fades).
- Progress persists in localStorage so a refresh doesn't reset completed challenges.

## Tech approach
- React + Tailwind, single-page with internal scene state.
- Lightweight custom canvas/DOM for each game (no heavy game engine) to keep bundle small and feel native.
- Design tokens added to `index.css` (ice white, silver, sky, royal, navy, gold) so the whole experience stays consistent.
- New components: `SceneManager`, `Hud`, `LandingScene`, `MazeGame`, `RunnerGame`, `SliceGame`, `UnlockScene`, `InvitationCard`, plus `useAudio` and `useParticles` hooks.
