import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { C, EASE_IN, EASE_IN_OUT, EASE_OUT, FONT_DISPLAY, FONT_UI } from "../brand";
import { lerp, ramp } from "../components/anim";
import { useLayout } from "../layout";
import { f, PRODUCT } from "../timeline";
import { Briefing, Discovery, Pipeline, Scoring, Signals } from "../ui/Dashboards";

const SECTIONS = [
  { key: "discovery", nav: "Discover", title: "Opportunity Discovery", sub: "Find the companies worth your attention.", C: Discovery },
  { key: "signals", nav: "Signals", title: "Signal Intelligence", sub: "See what is changing — and where it comes from.", C: Signals },
  { key: "scoring", nav: "Scoring", title: "Opportunity Scoring", sub: "Prioritize with transparent criteria.", C: Scoring },
  { key: "briefing", nav: "Briefings", title: "Opportunity Briefing", sub: "Understand why — before you reach out.", C: Briefing },
  { key: "pipeline", nav: "Pipeline", title: "Pipeline Overview", sub: "Keep every opportunity moving.", C: Pipeline },
] as const;

const NAV_ICONS = [
  "M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5",
  "M3 12h4l3-7 4 14 3-7h4",
  "M5 19V9M12 19V5M19 19v-7",
  "M6 3h9l4 4v14H6zM9 12h7M9 16h5",
  "M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v6h-4z",
];

const NavIcon: React.FC<{ d: string; color: string; size: number }> = ({ d, color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const starts = SECTIONS.map((s) => f(PRODUCT[s.key as keyof typeof PRODUCT]));

/** SCENE 4 — THE PRODUCT EXPERIENCE (19–35 s). */
export const S4Product: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { W, H, portrait } = useLayout();

  // which section + continuous index for the nav indicator
  let idx = 0;
  for (let i = 0; i < starts.length; i++) if (frame >= starts[i] - 6) idx = i;
  const navPos = starts.reduce((acc, s, i) => (i === 0 ? 0 : acc + ramp(frame, s - 8, s + 6, EASE_IN_OUT)), 0);

  // camera
  const enter = ramp(frame, 0, 46, EASE_OUT);
  const exit = ramp(frame, dur - 22, dur, EASE_IN);
  const push = 1 + 0.03 * ramp(frame, 40, dur - 20, EASE_IN_OUT);
  const camera = `perspective(2600px) translateY(${(1 - enter) * 140}px) rotateX(${(1 - enter) * 24}deg) rotateY(${(1 - enter) * (portrait ? 0 : -9)}deg) scale(${lerp(0.84, 1, enter) * push * (1 - exit * 0.12)})`;

  // geometry per format
  const win = portrait
    ? { w: 980, h: 1440, x: 50, y: 345 }
    : { w: 1640, h: 868, x: 140, y: 162 };
  const sidebar = portrait ? 0 : 236;
  const topbar = portrait ? 96 : 68;
  const pad = portrait ? 46 : 38;
  const cw = win.w - sidebar - pad * 2;
  const ch = win.h - topbar - pad * 2;

  const content = SECTIONS.map((s, i) => {
    const st = starts[i];
    const en = i < starts.length - 1 ? starts[i + 1] : dur + 30;
    if (frame < st - 8 || frame > en + 8) return null;
    const pin = ramp(frame, st - 2, st + 14, EASE_OUT);
    const pout = i < starts.length - 1 ? ramp(frame, en - 8, en + 2, EASE_IN) : 0;
    const op = (i === 0 ? 1 : pin) * (1 - pout);
    const Comp = s.C;
    return (
      <div
        key={s.key}
        style={{
          position: "absolute",
          left: pad,
          top: pad,
          width: cw,
          height: ch,
          opacity: op,
          transform: `translateX(${(1 - (i === 0 ? 1 : pin)) * 40 - pout * 40}px)`,
          filter: op < 0.999 ? `blur(${(1 - op) * 10}px)` : undefined,
        }}
      >
        <Comp t={frame - st} portrait={portrait} w={cw} h={ch} />
      </div>
    );
  });

  // light wipe across the content at each switch
  const wipes = starts.slice(1).map((s, i) => {
    const p = ramp(frame, s - 8, s + 8, EASE_IN_OUT);
    if (p <= 0 || p >= 1) return null;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${p * 100}%`,
          width: 3,
          background: "linear-gradient(180deg, rgba(53,184,255,0), #F5F7FB 50%, rgba(53,184,255,0))",
          boxShadow: "0 0 40px 10px rgba(8,123,255,0.45)",
          opacity: Math.sin(p * Math.PI),
        }}
      />
    );
  });

  // captions (outside the window)
  const captions = SECTIONS.map((s, i) => {
    const st = starts[i];
    const en = i < starts.length - 1 ? starts[i + 1] : dur;
    const p = ramp(frame, st + (i === 0 ? 14 : 0), st + (i === 0 ? 34 : 18), EASE_OUT);
    const o = i < starts.length - 1 ? ramp(frame, en - 10, en, EASE_IN) : ramp(frame, dur - 20, dur);
    const op = p * (1 - o);
    if (op <= 0) return null;
    return (
      <div
        key={s.key}
        style={{
          position: "absolute",
          left: portrait ? 0 : win.x,
          right: portrait ? 0 : undefined,
          top: portrait ? 118 : 50,
          textAlign: portrait ? "center" : "left",
          opacity: op,
          transform: `translateY(${(1 - p) * 14 - o * 8}px)`,
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "baseline", justifyContent: portrait ? "center" : "flex-start" }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: portrait ? 26 : 18, color: C.blue, letterSpacing: "0.2em", fontWeight: 600 }}>0{i + 1}</span>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: portrait ? 58 : 34, color: C.ice, fontWeight: 600, letterSpacing: "-0.02em" }}>{s.title}</span>
        </div>
        <div style={{ fontFamily: FONT_UI, fontSize: portrait ? 30 : 19, color: C.steel, marginTop: portrait ? 14 : 6, paddingLeft: portrait ? 0 : 46 }}>{s.sub}</div>
      </div>
    );
  });

  const tagOp = ramp(frame, 30, 50) * (1 - ramp(frame, dur - 20, dur));
  const tag = (
    <div
      style={{
        position: "absolute",
        right: portrait ? undefined : win.x,
        left: portrait ? 0 : undefined,
        width: portrait ? W : undefined,
        textAlign: portrait ? "center" : "right",
        top: portrait ? win.y + win.h + 46 : 64,
        fontFamily: FONT_UI,
        fontSize: portrait ? 22 : 14,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: C.steel,
        opacity: tagOp,
      }}
    >
      <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 7, background: C.blue, marginRight: 12, verticalAlign: "middle" }} />
      Product concept · Illustrative data
    </div>
  );

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      {/* soft floor glow under the window */}
      <AbsoluteFill style={{ background: `radial-gradient(45% 30% at 50% ${portrait ? 60 : 62}%, rgba(6,73,199,0.16), rgba(6,73,199,0) 70%)`, opacity: enter }} />
      {captions}
      {tag}
      <div
        style={{
          position: "absolute",
          left: win.x,
          top: win.y,
          width: win.w,
          height: win.h,
          transform: camera,
          transformOrigin: "50% 40%",
          opacity: enter,
          filter: exit > 0 ? `blur(${exit * 8}px)` : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: portrait ? 34 : 22,
            overflow: "hidden",
            background: "linear-gradient(180deg, #0C1018 0%, #080B12 100%)",
            border: `1px solid ${C.line2}`,
            boxShadow: "0 60px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(8,123,255,0.06), 0 0 80px rgba(6,73,199,0.12)",
          }}
        >
          {/* top highlight */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1, background: "linear-gradient(90deg, rgba(220,226,234,0), rgba(220,226,234,0.35), rgba(220,226,234,0))" }} />
          {/* sidebar (landscape) */}
          {!portrait && (
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: sidebar, borderRight: `1px solid ${C.line}`, background: "rgba(5,6,9,0.55)", padding: "26px 18px" }}>
              <div style={{ paddingLeft: 8, height: 44 }}>
                <Img src={staticFile("logo/wordmark.png")} style={{ width: 124 }} />
              </div>
              <div style={{ marginTop: 34, position: "relative" }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: navPos * 52, height: 44, borderRadius: 10, background: "rgba(8,123,255,0.14)", border: "1px solid rgba(8,123,255,0.4)" }} />
                {SECTIONS.map((s, i) => (
                  <div key={s.key} style={{ position: "relative", height: 44, marginBottom: 8, display: "flex", alignItems: "center", gap: 12, padding: "0 14px", fontFamily: FONT_UI, fontSize: 16, fontWeight: 500, color: i === idx ? C.ice : C.steel }}>
                    <NavIcon d={NAV_ICONS[i]} color={i === idx ? C.cyan : C.steel} size={19} />
                    {s.nav}
                  </div>
                ))}
              </div>
              <div style={{ position: "absolute", left: 18, right: 18, bottom: 24, display: "flex", alignItems: "center", gap: 12, paddingTop: 18, borderTop: `1px solid ${C.line}` }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#1A2232", color: C.silver, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_UI, fontSize: 13, fontWeight: 700 }}>YA</div>
                <div style={{ fontFamily: FONT_UI }}>
                  <div style={{ fontSize: 14, color: C.ice, fontWeight: 600 }}>Your Agency</div>
                  <div style={{ fontSize: 12, color: C.steel }}>Workspace</div>
                </div>
              </div>
            </div>
          )}
          {/* top bar */}
          <div style={{ position: "absolute", left: sidebar, right: 0, top: 0, height: topbar, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", padding: `0 ${portrait ? 30 : 28}px`, gap: 16 }}>
            {portrait ? (
              <>
                <Img src={staticFile("logo/wordmark.png")} style={{ width: 120 }} />
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  {SECTIONS.map((s, i) => (
                    <div key={s.key} style={{ width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: i === idx ? "rgba(8,123,255,0.16)" : "transparent", border: `1px solid ${i === idx ? "rgba(8,123,255,0.5)" : "transparent"}` }}>
                      <NavIcon d={NAV_ICONS[i]} color={i === idx ? C.cyan : C.steel} size={26} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ flex: 1, maxWidth: 520, height: 38, borderRadius: 10, border: `1px solid ${C.line2}`, background: "rgba(220,226,234,0.03)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", fontFamily: FONT_UI, fontSize: 15, color: C.steel }}>
                  <NavIcon d={NAV_ICONS[0]} color={C.steel} size={16} />
                  Search companies, signals, industries…
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ fontFamily: FONT_UI, fontSize: 14, color: C.steel }}>Week 45</div>
                <div style={{ width: 34, height: 34, borderRadius: 34, background: "linear-gradient(135deg,#1A2232,#2A3446)", border: `1px solid ${C.line2}` }} />
              </>
            )}
          </div>
          {/* content */}
          <div style={{ position: "absolute", left: sidebar, top: topbar, right: 0, bottom: 0, overflow: "hidden" }}>
            {content}
            {wipes}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
