import React from "react";
import { useCurrentFrame } from "remotion";
import { C, EASE_OUT, FONT_DISPLAY, EASE_IN } from "../brand";
import { ramp } from "./anim";

type Props = {
  /** Words wrapped in *asterisks* render in Electric Blue. */
  text: string;
  start: number;
  end?: number;
  size: number;
  weight?: number;
  stagger?: number;
  color?: string;
  align?: "center" | "left";
  tracking?: number;
  maxWidth?: number;
  lineHeight?: number;
};

/** Word-by-word mask reveal: each word rises out of its own clip box and de-blurs. */
export const Headline: React.FC<Props> = ({
  text,
  start,
  end,
  size,
  weight = 500,
  stagger = 3,
  color = C.ice,
  align = "center",
  tracking = -0.02,
  maxWidth,
  lineHeight = 1.12,
}) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const out = end !== undefined ? ramp(frame, end, end + 14, EASE_IN) : 0;
  return (
    <div
      style={{
        fontFamily: FONT_DISPLAY,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: `${tracking}em`,
        lineHeight,
        color,
        textAlign: align,
        maxWidth,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        columnGap: size * 0.26,
        opacity: 1 - out,
        filter: out > 0 ? `blur(${out * 10}px)` : undefined,
        transform: `translateY(${-out * size * 0.15}px)`,
      }}
    >
      {words.map((w, i) => {
        const blue = w.startsWith("*");
        const clean = w.replace(/\*/g, "");
        const p = ramp(frame, start + i * stagger, start + i * stagger + 22, EASE_OUT);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", padding: `0 0 ${size * 0.12}px`, marginBottom: -size * 0.12 }}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - p) * 105}%)`,
                opacity: p,
                filter: p < 1 ? `blur(${(1 - p) * 6}px)` : undefined,
                color: blue ? C.blue : undefined,
                textShadow: blue ? `0 0 ${size * 0.5}px rgba(8,123,255,0.45)` : undefined,
              }}
            >
              {clean}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/** Small all-caps kicker label, e.g. "01 — OPPORTUNITY DISCOVERY". */
export const Kicker: React.FC<{ children: React.ReactNode; size?: number; opacity?: number; color?: string }> = ({
  children,
  size = 18,
  opacity = 1,
  color = C.steel,
}) => (
  <div
    style={{
      fontFamily: FONT_DISPLAY,
      fontSize: size,
      letterSpacing: "0.32em",
      textTransform: "uppercase",
      color,
      opacity,
      fontWeight: 500,
    }}
  >
    {children}
  </div>
);
