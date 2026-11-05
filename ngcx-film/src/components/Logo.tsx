import React from "react";
import { Img, staticFile } from "remotion";

/**
 * The official NGCX logo, assembled from layers cut out of the original artwork
 * (see scripts/extract_logo_layers.py). Geometry and colours are untouched —
 * only reveal, light and glow are animated.
 *
 * Native layer box: 744 × 334 px (wordmark 744×222, INTELLIGENCE, claim).
 */
export const LOGO_W = 744;
export const LOGO_H = 334;
export const WORDMARK_H = 222;

type Props = {
  /** rendered width of the logo in px */
  width: number;
  /** 0→1 light-beam reveal of the silver letters (left → right) */
  beam?: number;
  /** 0→1 visibility of the blue X */
  x?: number;
  /** extra electric glow on the X (0 = as in artwork) */
  xPulse?: number;
  /** 0→1 specular sheen travelling across the silver letters */
  sheen?: number;
  intelligence?: number;
  claim?: number;
  showClaim?: boolean;
};

const layer = (name: string): React.CSSProperties => ({
  position: "absolute",
  left: 0,
  top: 0,
  width: LOGO_W,
  height: WORDMARK_H,
});

export const Logo: React.FC<Props> = ({
  width,
  beam = 1,
  x = 1,
  xPulse = 0,
  sheen = -1,
  intelligence = 1,
  claim = 1,
  showClaim = true,
}) => {
  const s = width / LOGO_W;
  const clipRight = (1 - beam) * 100;
  const maskUrl = `url(${staticFile("logo/wordmark-ngc.png")})`;
  return (
    <div style={{ width, height: (showClaim ? LOGO_H : 270) * s, position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: LOGO_W, height: LOGO_H, transform: `scale(${s})`, transformOrigin: "0 0" }}>
        {/* silver N G C — revealed by the light beam */}
        <div style={{ ...layer("ngc"), clipPath: `inset(-20% ${clipRight}% -20% 0)` }}>
          <Img src={staticFile("logo/wordmark-ngc.png")} style={{ width: LOGO_W, height: WORDMARK_H }} />
          {sheen > -0.5 && sheen < 1.5 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                WebkitMaskImage: maskUrl,
                maskImage: maskUrl,
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",
                background: `linear-gradient(105deg, rgba(255,255,255,0) ${sheen * 130 - 22}%, rgba(255,255,255,0.75) ${sheen * 130 - 15}%, rgba(255,255,255,0) ${sheen * 130 - 8}%)`,
                mixBlendMode: "screen",
              }}
            />
          )}
        </div>
        {/* beam edge highlight */}
        {beam > 0 && beam < 1 && (
          <div
            style={{
              position: "absolute",
              top: 30,
              height: 170,
              left: beam * LOGO_W - 1,
              width: 3,
              background: "linear-gradient(180deg, rgba(53,184,255,0), #F5F7FB 50%, rgba(53,184,255,0))",
              boxShadow: "0 0 24px 6px rgba(8,123,255,0.6)",
              opacity: Math.sin(beam * Math.PI),
            }}
          />
        )}
        {/* electric blue X */}
        <div style={{ ...layer("x"), opacity: x }}>
          <Img src={staticFile("logo/wordmark-x.png")} style={{ width: LOGO_W, height: WORDMARK_H }} />
        </div>
        {xPulse > 0.001 && (
          <>
            <div style={{ ...layer("xg"), opacity: Math.min(1, xPulse) * 0.9, filter: "blur(14px) brightness(1.6)", mixBlendMode: "screen" }}>
              <Img src={staticFile("logo/wordmark-x.png")} style={{ width: LOGO_W, height: WORDMARK_H }} />
            </div>
            <div style={{ ...layer("xg2"), opacity: Math.min(1, xPulse) * 0.55, filter: "brightness(1.35)", mixBlendMode: "screen" }}>
              <Img src={staticFile("logo/wordmark-x.png")} style={{ width: LOGO_W, height: WORDMARK_H }} />
            </div>
          </>
        )}
        {/* INTELLIGENCE */}
        <Img
          src={staticFile("logo/intelligence.png")}
          style={{
            position: "absolute",
            left: 20,
            top: 222,
            width: 672,
            height: 48,
            opacity: intelligence,
            clipPath: `inset(0 ${(1 - intelligence) * 50}% 0 ${(1 - intelligence) * 50}%)`,
          }}
        />
        {/* KNOW. DECIDE. GROW. */}
        {showClaim && (
          <Img
            src={staticFile("logo/claim.png")}
            style={{
              position: "absolute",
              left: 148,
              top: 292,
              width: 414,
              height: 34,
              opacity: claim,
              transform: `translateY(${(1 - claim) * 8}px)`,
            }}
          />
        )}
      </div>
    </div>
  );
};
