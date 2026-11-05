import React from "react";
import { C, EASE_IN_OUT, EASE_OUT, FONT_DISPLAY, FONT_UI } from "../brand";
import { lerp, ramp } from "../components/anim";
import { BRIEFING, COMPANIES, PIPELINE, SCORES, SIGNALS, STAGES } from "./data";
import { Bar, Card, Cursor, Label, Mono, Pill, Ring } from "./primitives";

type DP = { t: number; portrait: boolean; w: number; h: number };

const stag = (t: number, i: number, start: number, step: number, len = 16) => ramp(t, start + i * step, start + i * step + len, EASE_OUT);
const rise = (p: number, dist = 18): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * dist}px)` });

const Title: React.FC<{ title: string; sub?: string; portrait: boolean; right?: React.ReactNode }> = ({ title, sub, portrait, right }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: portrait ? 28 : 24 }}>
    <div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: portrait ? 40 : 30, fontWeight: 600, color: C.ice, letterSpacing: "-0.01em" }}>{title}</div>
      {sub && <div style={{ fontFamily: FONT_UI, fontSize: portrait ? 22 : 16, color: C.steel, marginTop: 6 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

const Chip: React.FC<{ children: React.ReactNode; portrait: boolean; blue?: boolean }> = ({ children, portrait, blue }) => (
  <span
    style={{
      fontFamily: FONT_UI,
      fontSize: portrait ? 19 : 14,
      color: blue ? C.ice : C.silver,
      padding: portrait ? "9px 16px" : "7px 13px",
      borderRadius: 10,
      border: `1px solid ${blue ? "rgba(8,123,255,0.5)" : C.line2}`,
      background: blue ? "rgba(8,123,255,0.12)" : "rgba(220,226,234,0.03)",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

/* ───────────────────────── 1. OPPORTUNITY DISCOVERY ───────────────────────── */
export const Discovery: React.FC<DP> = ({ t, portrait, w }) => {
  const sel = ramp(t, 50, 64, EASE_OUT);
  const dim = ramp(t, 56, 74, EASE_IN_OUT);
  const cur = ramp(t, 26, 50, EASE_IN_OUT);
  const click = ramp(t, 50, 66, EASE_OUT);
  const curOp = ramp(t, 20, 28) * (1 - ramp(t, 80, 92));

  if (portrait) {
    const rows = COMPANIES.slice(0, 5);
    return (
      <div style={{ position: "relative", width: w }}>
        <Title title="Opportunities" sub="Matched to your ideal customer profile" portrait right={<Chip portrait blue>Sorted by priority</Chip>} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {rows.map((c, i) => {
            const p = stag(t, i, 6, 5);
            const a = i === 0 ? sel : 0;
            return (
              <div key={c.name} style={{ ...rise(p), opacity: p * (i === 0 ? 1 : 1 - dim * 0.55) }}>
                <Card active={a} style={{ padding: "24px 26px", position: "relative", overflow: "hidden", background: a > 0 ? `linear-gradient(90deg, rgba(8,123,255,${0.16 * a}), rgba(14,19,28,0.75) 70%)` : undefined }}>
                  {a > 0 && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: C.blue, opacity: a, boxShadow: `0 0 16px ${C.blue}` }} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <Mono text={c.mono} size={62} active={a > 0.5} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FONT_UI, fontSize: 29, fontWeight: 600, color: C.ice }}>{c.name}</div>
                      <div style={{ fontFamily: FONT_UI, fontSize: 20, color: C.steel, marginTop: 4 }}>{c.industry} · {c.meta.split(" · ")[1]}</div>
                    </div>
                    <Pill p={c.priority} size={19} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, fontFamily: FONT_UI, fontSize: 21, color: C.silver }}>
                    <span style={{ width: 9, height: 9, borderRadius: 9, background: C.blue, boxShadow: `0 0 10px ${C.blue}` }} />
                    {c.signal}
                  </div>
                  <div style={{ fontFamily: FONT_UI, fontSize: 19, color: C.steel, marginTop: 8, paddingLeft: 21 }}>Opportunity: {c.opp}</div>
                </Card>
              </div>
            );
          })}
        </div>
        <Cursor x={lerp(w * 0.9, w * 0.6, cur)} y={lerp(1000, 120, cur)} click={click} opacity={curOp} scale={1.4} />
      </div>
    );
  }

  const cols = "minmax(0,2.3fr) minmax(0,1.25fr) minmax(0,2.4fr) minmax(0,2.2fr) minmax(0,1.1fr)";
  return (
    <div style={{ position: "relative", width: w }}>
      <Title
        title="Opportunities"
        sub="Companies matched to your ideal customer profile"
        portrait={false}
        right={
          <div style={{ display: "flex", gap: 10, ...rise(ramp(t, 4, 20)) }}>
            <Chip portrait={false}>ICP · B2B · 50–500 employees · DACH</Chip>
            <Chip portrait={false} blue>Sorted by priority</Chip>
          </div>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 20, padding: "0 22px 12px", borderBottom: `1px solid ${C.line}` }}>
        {["Company", "Industry", "Key signal", "Potential opportunity", "Priority"].map((h) => (
          <Label key={h} size={12}>{h}</Label>
        ))}
      </div>
      {COMPANIES.map((c, i) => {
        const p = stag(t, i, 8, 4);
        const a = i === 0 ? sel : 0;
        return (
          <div
            key={c.name}
            style={{
              ...rise(p, 14),
              opacity: p * (i === 0 ? 1 : 1 - dim * 0.5),
              position: "relative",
              display: "grid",
              gridTemplateColumns: cols,
              gap: 20,
              alignItems: "center",
              padding: "17px 22px",
              borderBottom: `1px solid ${C.line}`,
              borderRadius: a > 0 ? 12 : 0,
              background: a > 0 ? `linear-gradient(90deg, rgba(8,123,255,${0.18 * a}), rgba(8,123,255,${0.03 * a}))` : undefined,
              boxShadow: a > 0 ? `inset 0 0 0 1px rgba(8,123,255,${0.5 * a}), 0 0 ${36 * a}px rgba(8,123,255,${0.2 * a})` : undefined,
              fontFamily: FONT_UI,
            }}
          >
            {a > 0 && <div style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 4, borderRadius: 4, background: C.blue, opacity: a, boxShadow: `0 0 14px ${C.blue}` }} />}
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <Mono text={c.mono} size={44} active={a > 0.5} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 600, color: C.ice, whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 14, color: C.steel, marginTop: 3, whiteSpace: "nowrap" }}>{c.meta}</div>
              </div>
            </div>
            <div style={{ fontSize: 16, color: C.silver }}>{c.industry}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, color: C.silver }}>
              <span style={{ width: 8, height: 8, borderRadius: 8, flexShrink: 0, background: c.priority === "Low" ? C.steel : C.blue, boxShadow: c.priority === "Low" ? undefined : `0 0 10px ${C.blue}` }} />
              {c.signal}
            </div>
            <div style={{ fontSize: 16, color: C.steel }}>{c.opp}</div>
            <div><Pill p={c.priority} size={14} /></div>
          </div>
        );
      })}
      <Cursor x={lerp(w * 0.82, w * 0.27, cur)} y={lerp(640, 150, cur)} click={click} opacity={curOp} />
    </div>
  );
};

/* ───────────────────────── 2. SIGNAL INTELLIGENCE ───────────────────────── */
const SIG_ICON: Record<string, string> = {
  "Job posting": "M4 7h16v11H4zM9 7V5h6v2",
  Funding: "M12 3v18M7 8h7a3 3 0 010 6H8a3 3 0 000 6h8",
  Expansion: "M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4",
  Product: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5",
  Growth: "M4 18l6-6 4 4 6-8M15 8h5v5",
  Strategy: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8z",
};

const Icon: React.FC<{ d: string; size: number; color: string }> = ({ d, size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const CompanyHeader: React.FC<{ portrait: boolean; p: number; extra?: React.ReactNode }> = ({ portrait, p, extra }) => {
  const c = COMPANIES[0];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: portrait ? 22 : 18, ...rise(p) }}>
      <Mono text={c.mono} size={portrait ? 76 : 58} active />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: portrait ? 40 : 30, fontWeight: 600, color: C.ice }}>{c.name}</div>
        <div style={{ fontFamily: FONT_UI, fontSize: portrait ? 22 : 16, color: C.steel, marginTop: 4 }}>
          {c.industry} · {c.meta}
        </div>
      </div>
      {extra}
    </div>
  );
};

export const Signals: React.FC<DP> = ({ t, portrait, w }) => {
  const head = ramp(t, 2, 18);
  const list = SIGNALS.map((s, i) => {
    const p = stag(t, i, 12, 7, 18);
    const hot = ramp(t, 14 + i * 7, 24 + i * 7) * (1 - ramp(t, 24 + i * 7, 46 + i * 7)) * (s.rel === "Low" ? 0.3 : 1);
    return (
      <div key={s.title} style={{ ...rise(p, 12), display: "flex", gap: portrait ? 20 : 16, alignItems: "flex-start", position: "relative" }}>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: portrait ? 56 : 42,
              height: portrait ? 56 : 42,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: s.rel === "High" ? "rgba(8,123,255,0.16)" : "rgba(220,226,234,0.04)",
              border: `1px solid ${s.rel === "High" ? "rgba(8,123,255,0.55)" : C.line2}`,
              boxShadow: `0 0 ${22 * hot}px rgba(8,123,255,${0.7 * hot})`,
            }}
          >
            <Icon d={SIG_ICON[s.type]} size={portrait ? 28 : 21} color={s.rel === "High" ? C.cyan : C.silver} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, borderBottom: `1px solid ${C.line}`, paddingBottom: portrait ? 20 : 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ fontFamily: FONT_UI, fontSize: portrait ? 26 : 18, fontWeight: 600, color: C.ice, whiteSpace: "nowrap" }}>{s.title}</div>
            <Pill p={s.rel} size={portrait ? 17 : 12} label={`${s.rel} relevance`} />
          </div>
          <div style={{ fontFamily: FONT_UI, fontSize: portrait ? 20 : 14, color: C.steel, marginTop: 6, display: "flex", gap: 10 }}>
            <span style={{ color: C.silver }}>{s.type}</span>·<span>Source: {s.source}</span>·<span>{s.when}</span>
          </div>
        </div>
      </div>
    );
  });

  const note = (
    <Card style={{ padding: portrait ? "22px 26px" : "18px 20px", ...rise(ramp(t, 52, 70)) }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: C.blue }} />
        <div style={{ fontFamily: FONT_UI, fontSize: portrait ? 21 : 15, color: C.silver, lineHeight: 1.45 }}>
          Signals point to <span style={{ color: C.ice, fontWeight: 600 }}>potential demand</span> — they are not guaranteed buying intent.
        </div>
      </div>
    </Card>
  );

  if (portrait) {
    return (
      <div style={{ width: w }}>
        <CompanyHeader portrait p={head} />
        <div style={{ ...rise(ramp(t, 8, 22)), marginTop: 30, marginBottom: 22, display: "flex", gap: 12 }}>
          <Chip portrait blue>6 signals detected</Chip>
          <Chip portrait>Last 90 days</Chip>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>{list}</div>
        <div style={{ marginTop: 26 }}>{note}</div>
      </div>
    );
  }

  const bars = [2, 1, 3, 2, 2, 4, 3, 5, 4, 7, 6, 9];
  return (
    <div style={{ width: w, display: "flex", gap: 28 }}>
      <div style={{ flex: 1.9, minWidth: 0 }}>
        <CompanyHeader portrait={false} p={head} extra={<div style={rise(head)}><Chip portrait={false} blue>6 signals · last 90 days</Chip></div>} />
        <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 28 }}>{list}</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
        <Card style={{ padding: 22, ...rise(ramp(t, 16, 32)) }}>
          <Label>Signal activity · 12 weeks</Label>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 9, height: 170, marginTop: 22 }}>
            {bars.map((b, i) => {
              const g = ramp(t, 20 + i * 2.5, 38 + i * 2.5);
              const recent = i >= 9;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${(b / 9) * 100 * g}%`,
                    borderRadius: 4,
                    background: recent ? "linear-gradient(180deg, #35B8FF, #0649C7)" : "rgba(220,226,234,0.16)",
                    boxShadow: recent ? "0 0 14px rgba(8,123,255,0.5)" : undefined,
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontFamily: FONT_UI, fontSize: 13, color: C.steel }}>
            <span>12 weeks ago</span>
            <span style={{ color: C.cyan }}>This week</span>
          </div>
        </Card>
        <Card style={{ padding: 22, ...rise(ramp(t, 30, 46)) }}>
          <Label>Signal mix</Label>
          {[
            ["Hiring", 0.82],
            ["Growth & funding", 0.64],
            ["Expansion", 0.46],
          ].map(([l, v], i) => (
            <div key={l as string} style={{ marginTop: 16 }}>
              <div style={{ fontFamily: FONT_UI, fontSize: 15, color: C.silver, marginBottom: 8 }}>{l}</div>
              <Bar value={(v as number) * 100} progress={ramp(t, 36 + i * 5, 60 + i * 5)} height={7} strong={i === 0} />
            </div>
          ))}
        </Card>
        {note}
      </div>
    </div>
  );
};

/* ───────────────────────── 3. OPPORTUNITY SCORING ───────────────────────── */
export const Scoring: React.FC<DP> = ({ t, portrait, w }) => {
  const ringP = ramp(t, 10, 56, EASE_IN_OUT);
  const ringSize = portrait ? 330 : 270;
  const score = Math.round(84 * ringP);
  const gauge = (
    <Card active={ramp(t, 50, 66)} style={{ padding: portrait ? "34px 30px" : "30px 26px", display: "flex", flexDirection: "column", alignItems: "center", ...rise(ramp(t, 2, 18)) }}>
      <Label size={portrait ? 18 : 13}>Opportunity Priority</Label>
      <div style={{ position: "relative", width: ringSize, height: ringSize, marginTop: portrait ? 26 : 22 }}>
        <Ring value={84} progress={ringP} size={ringSize} stroke={portrait ? 16 : 13} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: portrait ? 110 : 88, fontWeight: 600, color: C.ice, letterSpacing: "-0.03em", lineHeight: 1 }}>{score}</div>
          <div style={{ fontFamily: FONT_UI, fontSize: portrait ? 20 : 15, color: C.steel, marginTop: 8 }}>of 100 · indicative</div>
        </div>
      </div>
      <div style={{ marginTop: portrait ? 26 : 22, opacity: ramp(t, 46, 60) }}>
        <Pill p="High" size={portrait ? 20 : 15} label="High priority" />
      </div>
    </Card>
  );
  const bars = (
    <div style={{ display: "flex", flexDirection: "column", gap: portrait ? 30 : 26 }}>
      {SCORES.map((s, i) => {
        const p = stag(t, i, 14, 7, 16);
        const fill = ramp(t, 18 + i * 7, 52 + i * 7, EASE_IN_OUT);
        const last = i === SCORES.length - 1;
        return (
          <div key={s.label} style={rise(p, 12)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: portrait ? 14 : 11 }}>
              <div style={{ fontFamily: FONT_UI, fontSize: portrait ? 27 : 20, fontWeight: 600, color: last ? C.ice : C.silver }}>{s.label}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: portrait ? 30 : 22, fontWeight: 600, color: last ? C.blue : C.ice }}>{Math.round(s.value * fill)}</div>
            </div>
            <Bar value={s.value} progress={fill} height={portrait ? 12 : 10} strong={last || i === 0} />
            <div style={{ fontFamily: FONT_UI, fontSize: portrait ? 19 : 14, color: C.steel, marginTop: 9 }}>{s.note}</div>
          </div>
        );
      })}
    </div>
  );
  const foot = (
    <div style={{ fontFamily: FONT_UI, fontSize: portrait ? 18 : 14, color: C.steel, lineHeight: 1.5, opacity: ramp(t, 60, 76) }}>
      Indicative prioritization based on your ideal customer profile and current signals. Not a prediction of deal outcome.
    </div>
  );
  if (portrait) {
    return (
      <div style={{ width: w }}>
        <CompanyHeader portrait p={ramp(t, 0, 14)} />
        <div style={{ marginTop: 30 }}>{gauge}</div>
        <div style={{ marginTop: 36 }}>{bars}</div>
        <div style={{ marginTop: 28 }}>{foot}</div>
      </div>
    );
  }
  return (
    <div style={{ width: w }}>
      <CompanyHeader portrait={false} p={ramp(t, 0, 14)} extra={<div style={rise(ramp(t, 4, 18))}><Chip portrait={false}>Scored against: your ICP</Chip></div>} />
      <div style={{ display: "flex", gap: 34, marginTop: 30, alignItems: "stretch" }}>
        <div style={{ width: 380 }}>{gauge}</div>
        <Card style={{ flex: 1, padding: "30px 34px" }}>
          {bars}
        </Card>
      </div>
      <div style={{ marginTop: 22 }}>{foot}</div>
    </div>
  );
};

/* ───────────────────────── 4. OPPORTUNITY BRIEFING ───────────────────────── */
export const Briefing: React.FC<DP> = ({ t, portrait, w }) => {
  const sec = (i: number) => {
    const s = BRIEFING[i];
    const p = stag(t, i, 14, 9, 20);
    const hl = s.h === "Why This Company?" || s.h === "Suggested Approach";
    return (
      <Card key={s.h} active={hl ? ramp(t, 14 + i * 9 + 12, 14 + i * 9 + 30) * 0.7 : 0} style={{ padding: portrait ? "24px 26px" : "20px 24px", ...rise(p, 14) }}>
        <Label size={portrait ? 17 : 12} color={hl ? C.cyan : C.steel}>{s.h}</Label>
        <div
          style={{
            fontFamily: FONT_UI,
            fontSize: portrait ? 24 : 17,
            lineHeight: 1.5,
            color: C.silver,
            marginTop: portrait ? 12 : 10,
            clipPath: `inset(0 ${(1 - ramp(t, 18 + i * 9, 40 + i * 9, EASE_OUT)) * 100}% 0 0)`,
          }}
        >
          {s.b}
        </div>
      </Card>
    );
  };
  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: portrait ? 28 : 22, ...rise(ramp(t, 0, 14)) }}>
      <Mono text="CS" size={portrait ? 76 : 58} active />
      <div style={{ flex: 1 }}>
        <Label size={portrait ? 17 : 12} color={C.cyan}>Opportunity Briefing</Label>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: portrait ? 40 : 30, fontWeight: 600, color: C.ice, marginTop: 4 }}>Corvane Systems</div>
      </div>
      {!portrait && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Chip portrait={false}>6 signals · sources linked</Chip>
          <Pill p="High" size={14} label="High priority" />
        </div>
      )}
    </div>
  );
  if (portrait) {
    return (
      <div style={{ width: w }}>
        {header}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>{BRIEFING.map((_, i) => sec(i))}</div>
      </div>
    );
  }
  return (
    <div style={{ width: w }}>
      {header}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>{[0, 1, 2].map(sec)}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>{[3, 4].map(sec)}</div>
      </div>
    </div>
  );
};

/* ───────────────────────── 5. PIPELINE OVERVIEW ───────────────────────── */
export const Pipeline: React.FC<DP> = ({ t, portrait, w }) => {
  const move = ramp(t, 40, 70, EASE_IN_OUT);
  const lift = Math.sin(move * Math.PI);
  const arrived = ramp(t, 68, 84);

  // stage membership after the move
  const placed = PIPELINE.map((c) => ({ ...c }));
  const counts = (after: boolean) => STAGES.map((_, s) => placed.filter((c) => (c.name === "Corvane Systems" ? (after ? 3 : 2) : c.stage) === s).length);
  const before = counts(false), after = counts(true);
  const idxIn = (name: string, stage: number, afterMove: boolean) => {
    const list = placed.filter((c) => (c.name === "Corvane Systems" ? (afterMove ? 3 : 2) : c.stage) === stage);
    return list.findIndex((c) => c.name === name);
  };

  // geometry
  const colGap = 18;
  const colW = portrait ? 0 : (w - colGap * 4) / 5;
  const cardH = portrait ? 100 : 104;
  const geo = (stage: number, idx: number) =>
    portrait
      ? { x: idx * ((w - 2 * 18) / 3 + 18), y: stage * 220 + 62, cw: (w - 2 * 18) / 3 }
      : { x: stage * (colW + colGap), y: 64 + idx * (cardH + 14), cw: colW };

  return (
    <div style={{ width: w, position: "relative", height: portrait ? 1120 : 640 }}>
      {STAGES.map((s, i) => {
        const g = geo(i, 0);
        const p = stag(t, i, 2, 4);
        const n = Math.round(lerp(before[i], after[i], arrived));
        const hot = i === 3 ? arrived : 0;
        return (
          <div key={s} style={{ position: "absolute", left: portrait ? 0 : g.x, top: portrait ? i * 220 : 0, width: portrait ? w : colW, ...rise(p, 10) }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: portrait ? 10 : 14, borderBottom: `${hot > 0 ? 2 : 1}px solid ${hot > 0 ? `rgba(8,123,255,${0.4 + 0.6 * hot})` : C.line2}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: i >= 3 ? C.blue : C.steel }} />
                <span style={{ fontFamily: FONT_UI, fontSize: portrait ? 23 : 16, fontWeight: 600, color: C.ice }}>{s}</span>
              </div>
              <span style={{ fontFamily: FONT_UI, fontSize: portrait ? 21 : 15, color: hot > 0 ? C.cyan : C.steel }}>{n}</span>
            </div>
            {!portrait && (
              <div style={{ position: "absolute", top: 50, left: -6, right: -6, height: 560, borderRadius: 14, background: "rgba(220,226,234,0.015)", border: `1px dashed ${i === 3 && move > 0.3 && move < 1 ? "rgba(8,123,255,0.45)" : "rgba(220,226,234,0.05)"}` }} />
            )}
          </div>
        );
      })}
      {placed.map((c, k) => {
        const isMover = c.name === "Corvane Systems";
        const a = geo(isMover ? 2 : c.stage, idxIn(c.name, isMover ? 2 : c.stage, false));
        const b = geo(isMover ? 3 : c.stage, idxIn(c.name, isMover ? 3 : c.stage, true));
        const m = isMover ? move : ramp(t, 52, 72, EASE_IN_OUT);
        const x = lerp(a.x, b.x, m);
        const y = lerp(a.y, b.y, m) - (isMover ? lift * 18 : 0);
        const p = stag(t, k, 8, 2.5);
        const glow = isMover ? Math.max(ramp(t, 30, 42) * (1 - arrived * 0.4), 0) : 0;
        return (
          <div
            key={c.name}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: a.cw,
              height: cardH,
              zIndex: isMover ? 5 : 1,
              ...rise(p, 10),
              transform: `translateY(${(1 - p) * 10}px) scale(${1 + lift * 0.04})`,
            }}
          >
            <Card
              active={glow}
              style={{
                height: "100%",
                boxSizing: "border-box",
                padding: portrait ? "14px 16px" : "14px 16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: isMover ? `linear-gradient(180deg, rgba(8,123,255,${0.12 + 0.1 * lift}), rgba(14,19,28,0.9))` : "linear-gradient(180deg, rgba(22,29,42,0.92), rgba(14,19,28,0.92))",
                boxShadow: isMover && lift > 0 ? `0 ${20 * lift}px ${40 * lift}px rgba(0,0,0,0.55), 0 0 30px rgba(8,123,255,${0.35 * glow})` : undefined,
              }}
            >
              <div style={{ fontFamily: FONT_UI, fontSize: portrait ? 19 : 16, fontWeight: 600, color: C.ice, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
              <Pill p={c.p} size={portrait ? 14 : 12} />
            </Card>
          </div>
        );
      })}
      {(() => {
        const a = geo(2, 0), b = geo(3, idxIn("Corvane Systems", 3, true));
        const cp = ramp(t, 22, 40, EASE_IN_OUT);
        const cx = lerp(lerp(w * 0.5, a.x + a.cw * 0.6, cp), b.x + b.cw * 0.6, move);
        const cy = lerp(lerp(portrait ? 900 : 520, a.y + cardH * 0.55, cp), b.y + cardH * 0.55, move) - lift * 18;
        return <Cursor x={cx} y={cy} click={ramp(t, 38, 52)} opacity={ramp(t, 18, 26) * (1 - ramp(t, 84, 94))} scale={portrait ? 1.4 : 1} />;
      })()}
    </div>
  );
};
