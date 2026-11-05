import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_IN_OUT, EASE_OUT } from "../brand";
import { Headline } from "../components/Headline";
import { LightLine } from "../components/LightSweep";
import { NetworkField } from "../components/NetworkField";
import { envelope, lerp, ramp } from "../components/anim";
import { useLayout } from "../layout";

/** SCENE 1 — THE OPPORTUNITY IS OUT THERE (0–6 s) */
export const S1Opening: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { W, H, portrait } = useLayout();
  const env = envelope(frame, dur, 1, 16);
  const line = ramp(frame, 8, 44, EASE_OUT);
  const lineFade = 1 - ramp(frame, 44, 80);
  const reveal = ramp(frame, 30, 120, EASE_IN_OUT);
  const zoom = lerp(1.35, 0.92, ramp(frame, 20, dur, EASE_OUT));
  const size = portrait ? 78 : 70;

  return (
    <AbsoluteFill style={{ opacity: env }}>
      <NetworkField
        W={W}
        H={H}
        count={portrait ? 170 : 150}
        seed={3}
        reveal={reveal}
        yaw={-0.5 + frame * 0.0032}
        pitch={-0.22}
        zoom={zoom}
        spread={portrait ? [1.0, 1.7, 1.1] : [1.7, 0.85, 1.2]}
      />
      {/* keep type legible: soft dark core behind the headline */}
      <AbsoluteFill style={{ background: "radial-gradient(50% 32% at 50% 50%, rgba(5,6,9,0.85) 0%, rgba(5,6,9,0) 100%)" }} />
      <LightLine progress={line} y={H / 2} width={W * 0.8} opacity={lineFade} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: portrait ? 90 : 0 }}>
        <div style={{ position: "absolute", width: portrait ? 860 : 1800, display: "flex", justifyContent: "center" }}>
          <Headline text="Your next opportunity is already out there." start={52} end={112} size={size} stagger={3} maxWidth={portrait ? 860 : 1800} />
        </div>
        <div style={{ position: "absolute", width: portrait ? 860 : 1500, display: "flex", justifyContent: "center" }}>
          <Headline text="But are you *seeing* it?" start={124} size={size} stagger={4} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
