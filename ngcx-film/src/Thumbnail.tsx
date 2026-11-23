import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT_DISPLAY } from "./brand";
import { Backdrop, Grain, Vignette } from "./components/Backdrop";
import { Logo } from "./components/Logo";
import { NetworkField } from "./components/NetworkField";
import { useLayout } from "./layout";

/** Video poster / thumbnail. */
export const Thumbnail: React.FC = () => {
  const { W, H, portrait } = useLayout();
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ opacity: 0.5 }}>
        <NetworkField W={W} H={H} count={150} seed={3} reveal={1} order={0.35} yaw={0.15} pitch={-0.4} zoom={0.95} pulses={0} spread={portrait ? [1.0, 1.7, 1.1] : [1.7, 0.85, 1.2]} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(50% 46% at 50% 46%, rgba(5,6,9,0.97) 0%, rgba(5,6,9,0.85) 55%, rgba(5,6,9,0) 100%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -20 }}>
          <Logo width={portrait ? 860 : 900} xPulse={0.35} />
          <div style={{ marginTop: portrait ? 110 : 80, fontFamily: FONT_DISPLAY, fontSize: portrait ? 58 : 48, fontWeight: 500, letterSpacing: "-0.02em", color: C.ice, textAlign: "center", maxWidth: portrait ? 860 : 1400, lineHeight: 1.2 }}>
            Turn market signals into <span style={{ color: C.blue }}>business opportunities.</span>
          </div>
        </div>
      </AbsoluteFill>
      <Vignette />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};
