import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, EASE_IN_OUT, FONT_UI } from "../brand";
import { Headline } from "../components/Headline";
import { envelope, rand, ramp } from "../components/anim";
import { useLayout } from "../layout";

const SOURCES = [
  { kind: "Company profile", title: "Industrial software · 120 staff" },
  { kind: "Website update", title: "New solutions page launched" },
  { kind: "News", title: "Regional expansion announced" },
  { kind: "Job posting", title: "Head of Growth Marketing" },
  { kind: "Market report", title: "B2B demand outlook Q3" },
  { kind: "Funding", title: "Series A closed" },
  { kind: "Press release", title: "New product line" },
  { kind: "Job posting", title: "Marketing Manager DACH" },
  { kind: "Trade fair", title: "Exhibitor list published" },
  { kind: "Company profile", title: "Logistics · 300 staff" },
  { kind: "News", title: "Leadership change" },
  { kind: "Website update", title: "Careers page redesign" },
];

const Card: React.FC<{ kind: string; title: string; signal: boolean; signalOn: number; scale: number }> = ({ kind, title, signal, signalOn, scale }) => (
  <div
    style={{
      width: 300,
      padding: "18px 20px",
      borderRadius: 14,
      background: "linear-gradient(180deg, rgba(22,29,42,0.92), rgba(12,16,24,0.92))",
      border: `1px solid ${signal && signalOn > 0.05 ? `rgba(8,123,255,${0.3 + 0.5 * signalOn})` : C.line2}`,
      boxShadow: signal && signalOn > 0.05 ? `0 0 ${30 * signalOn}px rgba(8,123,255,${0.35 * signalOn})` : "0 20px 40px rgba(0,0,0,0.5)",
      fontFamily: FONT_UI,
      transform: `scale(${scale})`,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.steel }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: signal ? C.blue : C.steel, opacity: signal ? 0.4 + 0.6 * signalOn : 0.6 }} />
      {kind}
    </div>
    <div style={{ marginTop: 10, fontSize: 19, color: C.silver, fontWeight: 500 }}>{title}</div>
    <div style={{ marginTop: 12, height: 6, width: "86%", borderRadius: 3, background: "rgba(220,226,234,0.08)" }} />
    <div style={{ marginTop: 7, height: 6, width: "60%", borderRadius: 3, background: "rgba(220,226,234,0.06)" }} />
  </div>
);

/** SCENE 2 — THE PROBLEM (6–13 s): scattered signals, most of them lost. */
export const S2Problem: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { W, H, portrait } = useLayout();
  const env = envelope(frame, dur, 14, 14);
  const N = portrait ? 24 : 26;

  const cards = useMemo(
    () =>
      new Array(N).fill(0).map((_, i) => ({
        x: (rand(i * 3.3 + 1) - 0.5) * (portrait ? 2.4 : 4.4),
        y: (rand(i * 5.1 + 2) - 0.5) * (portrait ? 4.6 : 2.4),
        z: 1.6 + rand(i * 7.9 + 3) * 5.0,
        src: SOURCES[i % SOURCES.length],
        signal: rand(i * 11.7) > 0.68,
        appear: Math.floor(rand(i * 2.2) * 50),
        lost: 70 + Math.floor(rand(i * 4.4) * 120),
      })),
    [N, portrait]
  );

  const dolly = ramp(frame, 0, dur, EASE_IN_OUT) * 1.4;
  const focal = Math.min(W, H) * 0.9;
  const size = portrait ? 76 : 84;

  const sorted = [...cards].map((c, i) => ({ ...c, i })).sort((a, b) => b.z - a.z);

  return (
    <AbsoluteFill style={{ opacity: env }}>
      <AbsoluteFill>
      {sorted.map((c) => {
        const z = c.z - dolly;
        if (z < 0.35) return null;
        const s = focal / (z * 430);
        const x = W / 2 + (c.x * focal) / z;
        const y = H / 2 + (c.y * focal) / z;
        const appear = ramp(frame, c.appear, c.appear + 24);
        const lost = ramp(frame, c.lost, c.lost + 40, EASE_IN_OUT);
        const signalOn = c.signal ? Math.max(0, Math.sin(((frame - c.appear) / 50) * Math.PI)) * (1 - lost) : 0;
        const dof = Math.abs(z - 3.0) * 1.3 + lost * 7;
        const near = Math.min(1, (z - 0.35) / 0.8);
        return (
          <div
            key={c.i}
            style={{
              position: "absolute",
              left: x - 150 * s,
              top: y - 60 * s,
              zIndex: Math.round(100 - z * 10),
              transformOrigin: "0 0",
              opacity: appear * (1 - lost * 0.85) * near * Math.min(1, 3.2 / z),
              filter: `blur(${Math.min(12, dof)}px)`,
            }}
          >
            <Card kind={c.src.kind} title={c.src.title} signal={c.signal} signalOn={signalOn} scale={s} />
          </div>
        );
      })}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(48% 30% at 50% 50%, rgba(5,6,9,0.82) 0%, rgba(5,6,9,0) 100%)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "absolute" }}>
          <Headline text="Too much information." start={18} end={74} size={size} />
        </div>
        <div style={{ position: "absolute" }}>
          <Headline text="Not enough *intelligence.*" start={84} end={142} size={size} maxWidth={portrait ? 800 : undefined} />
        </div>
        <div style={{ position: "absolute" }}>
          <Headline text="Missed opportunities." start={152} end={dur - 18} size={size} color={C.silver} maxWidth={portrait ? 800 : undefined} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
