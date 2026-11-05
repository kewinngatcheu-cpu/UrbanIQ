import T from "./timeline.json";

export const FPS = T.fps;
export const DURATION = Math.round(T.durationSec * T.fps);
export const f = (sec: number) => Math.round(sec * FPS);

export type SceneKey = keyof typeof T.scenes;
export const scene = (k: SceneKey) => {
  const s = T.scenes[k];
  return { from: f(s.start), duration: f(s.end) - f(s.start) };
};
export const PRODUCT = T.product;
export const TIMELINE = T;
