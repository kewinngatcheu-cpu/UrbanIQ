import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { C } from "../brand";
import { rand } from "./anim";

/** Cinematic black canvas: deep gradient, subtle grain, vignette. */
export const Backdrop: React.FC<{ glow?: number }> = ({ glow = 1 }) => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 90% at 50% 45%, ${C.obsidian} 0%, ${C.deepBlack} 62%, #020304 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          opacity: 0.55 * glow,
          background: "radial-gradient(60% 45% at 50% 52%, rgba(6,73,199,0.10) 0%, rgba(6,73,199,0) 70%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => {
  const frame = useCurrentFrame();
  const ox = Math.floor(rand(frame) * 384);
  const oy = Math.floor(rand(frame + 99) * 384);
  return (
    <AbsoluteFill
      style={{
        opacity,
        mixBlendMode: "overlay",
        backgroundImage: `url(${staticFile("fx/grain.png")})`,
        backgroundPosition: `${ox}px ${oy}px`,
        pointerEvents: "none",
      }}
    />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(110% 85% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.72) 100%)",
      pointerEvents: "none",
    }}
  />
);

