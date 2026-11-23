import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, EASE_IN_OUT, EASE_OUT, FONT_DISPLAY } from "../brand";
import { Headline } from "../components/Headline";
import { Logo } from "../components/Logo";
import { lerp, ramp } from "../components/anim";
import { useLayout } from "../layout";

export const S6_LOGO_X = 50;

/** SCENE 6 — THE BRAND STATEMENT (44–55 s). Ends on a calm, static end card. */
export const S6Brand: React.FC<{ dur: number }> = () => {
  const frame = useCurrentFrame();
  const { W, H, portrait } = useLayout();
  const fadeIn = ramp(frame, 0, 12);
  const sweep = ramp(frame, 6, 52, EASE_IN_OUT);
  const beam = ramp(frame, 16, 52, EASE_IN_OUT);
  const xOn = ramp(frame, S6_LOGO_X - 4, S6_LOGO_X + 6);
  const pulse = ramp(frame, S6_LOGO_X, S6_LOGO_X + 6) * (1 - ramp(frame, S6_LOGO_X + 8, S6_LOGO_X + 60, EASE_OUT));
  const intel = ramp(frame, 62, 92, EASE_OUT);
  const claim = ramp(frame, 86, 112, EASE_OUT);
  const sheen = lerp(-0.4, 1.4, ramp(frame, 70, 118, EASE_IN_OUT));
  const settle = lerp(1.02, 1, ramp(frame, 16, 150, EASE_OUT));
  const disc = ramp(frame, 172, 196, EASE_OUT);
  const logoW = portrait ? 860 : 880;

  const sweepX = lerp(-0.1, 1.1, sweep) * W;
  const sweepOp = Math.sin(sweep * Math.PI);

  return (
    <AbsoluteFill style={{ opacity: fadeIn, background: C.deepBlack }}>
      {/* the travelling light impulse */}
      {sweep > 0 && sweep < 1 && (
        <>
          <div style={{ position: "absolute", left: 0, width: sweepX, top: H * (portrait ? 0.4 : 0.36), height: 1.5, background: "linear-gradient(90deg, rgba(8,123,255,0), rgba(8,123,255,0.7))", opacity: sweepOp }} />
          <div style={{ position: "absolute", left: sweepX - 160, top: H * (portrait ? 0.4 : 0.36) - 160, width: 320, height: 320, borderRadius: 999, background: "radial-gradient(circle, rgba(53,184,255,0.35) 0%, rgba(8,123,255,0.12) 35%, rgba(8,123,255,0) 70%)", opacity: sweepOp }} />
        </>
      )}
      {/* restrained halo behind the logo */}
      <AbsoluteFill style={{ background: `radial-gradient(40% 26% at 50% ${portrait ? 40 : 36}%, rgba(6,73,199,0.13), rgba(6,73,199,0) 70%)`, opacity: intel }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${settle})`, marginTop: portrait ? 40 : -10 }}>
          <Logo width={logoW} beam={beam} x={xOn} xPulse={pulse} sheen={sheen} intelligence={intel} claim={claim} />
          <div style={{ height: portrait ? 120 : 92 }} />
          <Headline
            text="Turn market signals into business opportunities."
            start={126}
            size={portrait ? 56 : 46}
            weight={500}
            stagger={3}
            maxWidth={portrait ? 860 : 1400}
            lineHeight={1.2}
          />
          <div
            style={{
              marginTop: portrait ? 64 : 44,
              display: "flex",
              alignItems: "center",
              gap: 18,
              opacity: disc,
              transform: `translateY(${(1 - disc) * 10}px)`,
            }}
          >
            <div style={{ width: 36 * disc, height: 1.5, background: C.blue }} />
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: portrait ? 30 : 22, letterSpacing: "0.3em", color: C.silver, fontWeight: 500, textTransform: "uppercase" }}>Discover NGCX.</span>
            <div style={{ width: 36 * disc, height: 1.5, background: C.blue }} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
