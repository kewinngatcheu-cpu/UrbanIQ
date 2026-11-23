import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, EASE_IN_OUT, EASE_OUT, FONT_DISPLAY } from "../brand";
import { LightSweep } from "../components/LightSweep";
import { Logo } from "../components/Logo";
import { NetworkField } from "../components/NetworkField";
import { envelope, lerp, ramp } from "../components/anim";
import { useLayout } from "../layout";

export const S3_LOGO_X = 84; // frame (local) where the X ignites — synced with audio impact

/** SCENE 3 — NGCX INTRODUCTION (13–19 s): chaos resolves into structure, logo reveal. */
export const S3Intro: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { W, H, portrait } = useLayout();
  const env = envelope(frame, dur, 12, 14);
  const order = ramp(frame, 0, 62, EASE_IN_OUT);
  const netOut = ramp(frame, 50, 86, EASE_IN_OUT);
  const beam = ramp(frame, 58, 90, EASE_IN_OUT);
  const xOn = ramp(frame, S3_LOGO_X - 4, S3_LOGO_X + 6);
  const pulse = ramp(frame, S3_LOGO_X, S3_LOGO_X + 6) * (1 - ramp(frame, S3_LOGO_X + 8, S3_LOGO_X + 44, EASE_OUT));
  const intel = ramp(frame, 98, 128, EASE_OUT);
  const sub = ramp(frame, 122, 150, EASE_OUT);
  const logoW = portrait ? 780 : 860;
  const push = lerp(1.0, 1.035, ramp(frame, 58, dur, EASE_OUT));

  return (
    <AbsoluteFill style={{ opacity: env }}>
      <AbsoluteFill style={{ opacity: 1 - netOut * 0.85, transform: `scale(${1 + netOut * 0.25})` }}>
        <NetworkField
          W={W}
          H={H}
          count={portrait ? 165 : 150}
          seed={3}
          reveal={1}
          order={order}
          yaw={lerp(0.25, 0, order)}
          pitch={lerp(-0.22, -0.55, order)}
          zoom={lerp(1.0, 0.9, order)}
          signalBoost={1 + order}
          pulses={1 + order}
          spread={portrait ? [1.0, 1.7, 1.1] : [1.7, 0.85, 1.2]}
        />
      </AbsoluteFill>
      <LightSweep start={50} dur={34} intensity={portrait ? 0.45 : 0.8} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: `scale(${push})` }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Logo width={logoW} beam={beam} x={xOn} xPulse={pulse} sheen={lerp(-0.4, 1.4, ramp(frame, 104, 150, EASE_IN_OUT))} intelligence={intel} showClaim={false} />
          <div
            style={{
              marginTop: portrait ? 70 : 54,
              fontFamily: FONT_DISPLAY,
              fontSize: portrait ? 50 : 40,
              fontWeight: 400,
              letterSpacing: "-0.01em",
              color: C.silver,
              opacity: sub,
              transform: `translateY(${(1 - sub) * 16}px)`,
              filter: sub < 1 ? `blur(${(1 - sub) * 6}px)` : undefined,
            }}
          >
            New Business <span style={{ color: C.blue }}>Intelligence.</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
