import { Easing } from "remotion";
import "@fontsource-variable/inter";
import "@fontsource-variable/sora";

/** NGCX colour system — derived from the official logo. */
export const C = {
  deepBlack: "#050609",
  obsidian: "#080B12",
  graphite: "#111722",
  graphite2: "#161D2A",
  line: "rgba(220,226,234,0.08)",
  line2: "rgba(220,226,234,0.14)",
  silver: "#DCE2EA",
  ice: "#F5F7FB",
  blue: "#087BFF",
  deepBlue: "#0649C7",
  cyan: "#35B8FF",
  steel: "#738197",
  glow: "rgba(8,123,255,0.35)",
  glowSoft: "rgba(8,123,255,0.14)",
} as const;

export const FONT_DISPLAY = "'Sora Variable', 'Inter Variable', sans-serif";
export const FONT_UI = "'Inter Variable', sans-serif";

/** Motion vocabulary: calm, precise, no overshoot. */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const EASE_IN = Easing.bezier(0.55, 0, 0.9, 0.4);

export const silverText: React.CSSProperties = {
  background: "linear-gradient(180deg, #F5F7FB 0%, #DCE2EA 55%, #9AA6B8 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};
