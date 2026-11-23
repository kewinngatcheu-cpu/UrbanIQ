import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, EASE_IN_OUT, EASE_OUT, FONT_DISPLAY, FONT_UI } from "../brand";
import { envelope, lerp, rand, ramp } from "../components/anim";
import { useLayout } from "../layout";

const STAGES = ["Market Signals", "Company Intelligence", "Opportunity Discovery", "Smart Prioritization", "New Business Opportunities"];
const WORDS = ["Discover.", "Understand.", "Prioritize.", "Grow."];
const NODE_T = (i: number) => 16 + i * 20;
const WORD_T = (i: number) => 92 + i * 30;

/** SCENE 5 — FROM SIGNALS TO OPPORTUNITIES (35–44 s). */
export const S5Flow: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { W, H, portrait } = useLayout();
  const env = envelope(frame, dur, 18, 20);
  const draw = ramp(frame, 8, NODE_T(4) + 10, EASE_IN_OUT) * 4; // 0..4 segments drawn
  const enter = ramp(frame, 0, 40, EASE_OUT);

  // path geometry
  const A = portrait ? { x: 250, y: 760 } : { x: 250, y: 640 };
  const B = portrait ? { x: 250, y: 1640 } : { x: 1670, y: 640 };
  const at = (u: number) => ({ x: lerp(A.x, B.x, u / 4), y: lerp(A.y, B.y, u / 4) });
  const dirX = portrait ? 0 : 1, dirY = portrait ? 1 : 0;

  // particles
  const parts = new Array(portrait ? 110 : 130).fill(0).map((_, k) => {
    const speed = 0.028 + rand(k * 3.7) * 0.02;
    const u = ((frame * speed + rand(k * 1.9) * 6) % 6) - 1.4; // -1.4 .. 4.6
    if (u > draw + 0.05) return null;
    const jitter = Math.max(0, 1 - Math.max(0, u) / 3.2);
    let x: number, y: number;
    if (u < 0) {
      // chaos zone before the first node: scattered signals converge
      const sx = (rand(k * 5.3) - 0.5) * (portrait ? 700 : 360);
      const sy = (rand(k * 8.1) - 0.5) * (portrait ? 360 : 640);
      const t = (u + 1.4) / 1.4;
      const e = t * t;
      x = A.x + (portrait ? sx * (1 - e) + 0 : -(1 - e) * 230 + sx * (1 - e) * 0.6);
      y = A.y + (portrait ? -(1 - e) * 300 + sy * (1 - e) * 0.5 : sy * (1 - e));
    } else {
      const p = at(Math.min(u, 4.6));
      const off = (rand(k * 9.9) - 0.5) * 70 * jitter;
      x = p.x + off * dirY;
      y = p.y + off * dirX;
    }
    const blue = u > 1.5;
    const op = Math.min(1, (u + 1.4) * 2) * (u > 4 ? Math.max(0, 1 - (u - 4) / 0.6) : 1);
    return <circle key={k} cx={x} cy={y} r={blue ? 2.6 : 1.8} fill={blue ? C.cyan : C.silver} opacity={op * (blue ? 0.95 : 0.55)} />;
  });

  const nodes = STAGES.map((s, i) => {
    const p = at(i);
    const on = ramp(frame, NODE_T(i), NODE_T(i) + 14, EASE_OUT);
    const pulse = ramp(frame, NODE_T(i), NODE_T(i) + 6) * (1 - ramp(frame, NODE_T(i) + 6, NODE_T(i) + 30));
    const last = i === STAGES.length - 1;
    const r = last ? 30 : 22;
    return (
      <div key={s} style={{ position: "absolute", left: p.x, top: p.y, opacity: on }}>
        <div
          style={{
            position: "absolute",
            left: -r,
            top: -r,
            width: r * 2,
            height: r * 2,
            borderRadius: 99,
            border: `1.5px solid ${i >= 2 ? C.blue : C.silver}`,
            background: last ? "radial-gradient(circle, #35B8FF 0%, #087BFF 45%, #0649C7 100%)" : "rgba(5,6,9,0.9)",
            boxShadow: `0 0 ${20 + 40 * pulse}px rgba(8,123,255,${0.25 + 0.5 * pulse + (last ? 0.3 : 0)})`,
            transform: `scale(${0.6 + 0.4 * on + 0.15 * pulse})`,
          }}
        >
          {!last && <div style={{ position: "absolute", inset: r * 0.55, borderRadius: 99, background: i >= 2 ? C.blue : C.silver }} />}
        </div>
        <div
          style={{
            position: "absolute",
            ...(portrait ? { left: 70, top: -26, width: 640 } : { left: -130, top: 54, width: 260, textAlign: "center" as const }),
            transform: `translateY(${(1 - on) * 10}px)`,
          }}
        >
          <div style={{ fontFamily: FONT_UI, fontSize: portrait ? 20 : 13, letterSpacing: "0.22em", color: i >= 2 ? C.blue : C.steel, fontWeight: 600 }}>0{i + 1}</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: portrait ? 36 : 22, color: last ? C.ice : C.silver, fontWeight: last ? 600 : 500, marginTop: 6, lineHeight: 1.25 }}>{s}</div>
        </div>
      </div>
    );
  });

  const segs = (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="flowg" x1={A.x} y1={A.y} x2={B.x} y2={B.y} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={C.steel} stopOpacity={0.5} />
          <stop offset="45%" stopColor={C.blue} />
          <stop offset="100%" stopColor={C.cyan} />
        </linearGradient>
      </defs>
      <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="rgba(220,226,234,0.06)" strokeWidth={2} />
      <line
        x1={A.x}
        y1={A.y}
        x2={lerp(A.x, B.x, draw / 4)}
        y2={lerp(A.y, B.y, draw / 4)}
        stroke="url(#flowg)"
        strokeWidth={2.5}
        style={{ filter: "drop-shadow(0 0 6px rgba(8,123,255,0.8))" }}
      />
      {parts}
    </svg>
  );

  // word sequence
  const words = (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: portrait ? 200 : 250,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: portrait ? 34 : 42,
        rowGap: 6,
        padding: portrait ? "0 60px" : 0,
      }}
    >
      {WORDS.map((w, i) => {
        const p = ramp(frame, WORD_T(i), WORD_T(i) + 18, EASE_OUT);
        const next = i < WORDS.length - 1 ? ramp(frame, WORD_T(i + 1), WORD_T(i + 1) + 14) : 0;
        const last = i === WORDS.length - 1;
        return (
          <span
            key={w}
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: portrait ? 96 : 84,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              color: last ? C.blue : C.ice,
              opacity: p * (1 - next * 0.6),
              transform: `translateY(${(1 - p) * 30}px)`,
              filter: p < 1 ? `blur(${(1 - p) * 8}px)` : undefined,
              textShadow: last ? "0 0 50px rgba(8,123,255,0.5)" : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );

  // dim the diagram once the words take over (keeps hierarchy clear)
  const diagramDim = 1 - 0.45 * ramp(frame, WORD_T(0) - 6, WORD_T(0) + 20);

  return (
    <AbsoluteFill style={{ opacity: env }}>
      <AbsoluteFill style={{ opacity: diagramDim * enter, transform: `scale(${lerp(1.06, 1, enter)})` }}>
        {segs}
        {nodes}
      </AbsoluteFill>
      {words}
    </AbsoluteFill>
  );
};
