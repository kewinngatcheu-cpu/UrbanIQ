import { interpolate } from "remotion";
import { EASE_OUT } from "../brand";

type Ease = (t: number) => number;

/** Clamped 0→1 ramp between two frames. */
export const ramp = (frame: number, a: number, b: number, ease: Ease = EASE_OUT) =>
  interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** In/out envelope for a scene of length `dur` (frames). */
export const envelope = (frame: number, dur: number, inF = 12, outF = 12) =>
  Math.min(ramp(frame, 0, inF), 1 - ramp(frame, dur - outF, dur));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Deterministic pseudo random in [0,1). */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
