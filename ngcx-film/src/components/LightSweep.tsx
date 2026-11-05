import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_IN_OUT } from "../brand";
import { ramp } from "./anim";

/**
 * Electric-blue light wipe. A thin bright core with a soft volumetric halo
 * travels across the frame — the signature NGCX transition (echoes the X).
 */
export const LightSweep: React.FC<{ start: number; dur: number; vertical?: boolean; intensity?: number; angle?: number }> = ({
  start,
  dur,
  vertical = false,
  intensity = 1,
  angle = 0,
}) => {
  const frame = useCurrentFrame();
  const p = ramp(frame, start, start + dur, EASE_IN_OUT);
  if (frame < start || frame > start + dur) return null;
  const fade = Math.sin(p * Math.PI);
  const pos = -20 + p * 140; // percent
  const dir = vertical ? "to bottom" : "to right";
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: fade * intensity, transform: `rotate(${angle}deg) scale(1.4)` }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(${dir}, rgba(8,123,255,0) ${pos - 14}%, rgba(6,73,199,0.18) ${pos - 4}%, rgba(8,123,255,0.42) ${pos - 0.4}%, rgba(245,247,251,0.95) ${pos}%, rgba(53,184,255,0.5) ${pos + 0.4}%, rgba(6,73,199,0.12) ${pos + 4}%, rgba(8,123,255,0) ${pos + 10}%)`,
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};

/** A horizontal hairline of light that grows from the centre (opening shot). */
export const LightLine: React.FC<{ progress: number; y: number; width: number; opacity?: number }> = ({
  progress,
  y,
  width,
  opacity = 1,
}) => (
  <div
    style={{
      position: "absolute",
      left: "50%",
      top: y,
      width,
      height: 2,
      marginLeft: -width / 2,
      transform: `scaleX(${progress})`,
      opacity,
      background: "linear-gradient(90deg, rgba(8,123,255,0) 0%, #087BFF 30%, #F5F7FB 50%, #087BFF 70%, rgba(8,123,255,0) 100%)",
      boxShadow: "0 0 18px 2px rgba(8,123,255,0.55), 0 0 60px 8px rgba(6,73,199,0.25)",
    }}
  />
);
