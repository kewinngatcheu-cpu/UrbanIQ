import React from "react";
import { C, FONT_UI } from "../brand";
import type { Priority } from "./data";

export const PRIORITY_COLOR: Record<Priority, string> = {
  High: C.blue,
  Medium: C.silver,
  Low: C.steel,
};

export const Pill: React.FC<{ p: Priority; size?: number; label?: string }> = ({ p, size = 14, label }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.45,
      padding: `${size * 0.32}px ${size * 0.75}px`,
      borderRadius: 999,
      fontSize: size,
      fontWeight: 600,
      letterSpacing: "0.02em",
      fontFamily: FONT_UI,
      color: p === "High" ? C.ice : p === "Medium" ? C.silver : C.steel,
      background: p === "High" ? "rgba(8,123,255,0.18)" : "rgba(220,226,234,0.06)",
      border: `1px solid ${p === "High" ? "rgba(8,123,255,0.55)" : C.line2}`,
      whiteSpace: "nowrap",
      alignSelf: "flex-start",
    }}
  >
    <span style={{ width: size * 0.45, height: size * 0.45, borderRadius: 99, background: PRIORITY_COLOR[p], boxShadow: p === "High" ? `0 0 8px ${C.blue}` : undefined }} />
    {label ?? p}
  </span>
);

export const Mono: React.FC<{ text: string; size?: number; active?: boolean }> = ({ text, size = 40, active }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.26,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT_UI,
      fontSize: size * 0.36,
      fontWeight: 700,
      letterSpacing: "0.02em",
      color: active ? C.ice : C.silver,
      background: active ? "linear-gradient(135deg, #0649C7, #087BFF)" : "linear-gradient(135deg, #1A2232, #111722)",
      border: `1px solid ${active ? "rgba(53,184,255,0.6)" : C.line2}`,
      flexShrink: 0,
    }}
  >
    {text}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; active?: number }> = ({ children, style, active = 0 }) => (
  <div
    style={{
      background: "linear-gradient(180deg, rgba(22,29,42,0.75), rgba(14,19,28,0.75))",
      border: `1px solid ${active > 0 ? `rgba(8,123,255,${0.2 + active * 0.5})` : C.line}`,
      borderRadius: 16,
      boxShadow: active > 0 ? `0 0 ${40 * active}px rgba(8,123,255,${0.18 * active})` : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Label: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 13, color = C.steel, style }) => (
  <div style={{ fontFamily: FONT_UI, fontSize: size, letterSpacing: "0.14em", textTransform: "uppercase", color, fontWeight: 600, ...style }}>{children}</div>
);

/** Horizontal score bar with animated fill and glowing head. */
export const Bar: React.FC<{ value: number; progress: number; height?: number; strong?: boolean }> = ({ value, progress, height = 10, strong }) => (
  <div style={{ position: "relative", height, borderRadius: height, background: "rgba(220,226,234,0.07)", overflow: "visible" }}>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: `${value * progress}%`,
        borderRadius: height,
        background: strong ? "linear-gradient(90deg, #0649C7, #087BFF 70%, #35B8FF)" : "linear-gradient(90deg, #3A4558, #DCE2EA)",
        boxShadow: strong ? "0 0 16px rgba(8,123,255,0.55)" : undefined,
      }}
    />
  </div>
);

/** Circular gauge. */
export const Ring: React.FC<{ value: number; progress: number; size: number; stroke?: number }> = ({ value, progress, size, stroke = 12 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = (value / 100) * progress;
  return (
    <svg width={size} height={size}>
      <defs>
        <linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#35B8FF" />
          <stop offset="60%" stopColor="#087BFF" />
          <stop offset="100%" stopColor="#0649C7" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(220,226,234,0.08)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#ringg)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c * v} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: "drop-shadow(0 0 10px rgba(8,123,255,0.6))" }}
      />
    </svg>
  );
};

/** Minimal pointer used to suggest real interaction. */
export const Cursor: React.FC<{ x: number; y: number; click: number; opacity: number; scale?: number }> = ({ x, y, click, opacity, scale = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, opacity, pointerEvents: "none", transform: `scale(${scale})`, transformOrigin: "0 0" }}>
    {click > 0 && click < 1 && (
      <div
        style={{
          position: "absolute",
          left: -22 * (0.4 + click),
          top: -22 * (0.4 + click),
          width: 44 * (0.4 + click),
          height: 44 * (0.4 + click),
          borderRadius: 999,
          border: `2px solid rgba(8,123,255,${1 - click})`,
        }}
      />
    )}
    <svg width="26" height="30" viewBox="0 0 26 30">
      <path d="M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26.2 L12 17 L20 17 Z" fill="#F5F7FB" stroke="#050609" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  </div>
);
