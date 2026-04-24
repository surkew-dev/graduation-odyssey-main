export type Scene = "landing" | "maze" | "interlude-2" | "runner" | "interlude-3" | "slice" | "unlock";

export const SCENE_ORDER: Scene[] = ["landing", "maze", "interlude-2", "runner", "interlude-3", "slice", "unlock"];

export const GAME_SCENES: Scene[] = ["maze", "runner", "slice"];

export function progressIndex(scene: Scene): number {
  // returns number of completed challenges (0-3)
  if (scene === "landing" || scene === "maze") return 0;
  if (scene === "interlude-2" || scene === "runner") return 1;
  if (scene === "interlude-3" || scene === "slice") return 2;
  return 3;
}
