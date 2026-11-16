import React from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';

/* ───────── Fonts ───────── */
const fontHandle = delayRender('fonts');
const FONTS: [string, string, string][] = [
  ['Inter', 'Inter-Regular.otf', '400'],
  ['Inter', 'Inter-Medium.otf', '500'],
  ['Inter', 'Inter-SemiBold.otf', '600'],
  ['Inter', 'Inter-Bold.otf', '700'],
  ['Inter Display', 'InterDisplay-Medium.otf', '500'],
  ['Inter Display', 'InterDisplay-SemiBold.otf', '600'],
  ['Inter Display', 'InterDisplay-Bold.otf', '700'],
];
Promise.all(
  FONTS.map(([family, file, weight]) => {
    const f = new FontFace(family, `url(${staticFile('fonts/' + file)})`, {weight});
    return f.load().then((l) => document.fonts.add(l));
  }),
).then(() => continueRender(fontHandle));

/* ───────── Brand ───────── */
const BG = '#08090B';
const WHITE = '#ECEEF1';
const SILVER = '#969CA5';
const MUTED = '#5F646E';
const B1 = '#2F6BFF';
const B2 = '#5AAAFF';
const GRAD = `linear-gradient(90deg, ${B1} 0%, ${B2} 100%)`;
const DISPLAY = '"Inter Display", Inter, sans-serif';
const TEXT = 'Inter, sans-serif';
const LEFT = 100; // ≥ 90 px side margin
const CONTENT_W = 1080 - 2 * LEFT;

/* ───────── Timing (frames @ 30 fps) ───────── */
export const SCENES = [
  {start: 0, end: 75}, // 1 Hook        0.0 – 2.5 s
  {start: 75, end: 165}, // 2 Studie     2.5 – 5.5 s
  {start: 165, end: 255}, // 3 Twist     5.5 – 8.5 s
  {start: 255, end: 375}, // 4 Vergleich 8.5 – 12.5 s
  {start: 375, end: 480}, // 5 Summe     12.5 – 16.0 s
  {start: 480, end: 555}, // 6 These     16.0 – 18.5 s
  {start: 555, end: 648}, // 7 Endkarte  18.5 – 21.6 s
];
export const TOTAL = 648;
const H = 4; // half transition window → 8 frames ≈ 267 ms

/* ───────── Easing helpers ───────── */
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const easeInCubic = (t: number) => Math.pow(clamp(t), 3);
const easeInOutQuart = (t: number) => {
  t = clamp(t);
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
};
const prog = (f: number, start: number, dur: number) => clamp((f - start) / dur);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* German number format: 162000 → "162.000" */
const de = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const NB = ' ';

/* Line reveal: slide-up + fade + blur→sharp */
const reveal = (f: number, delay: number, dur = 13, dist = 26): React.CSSProperties => {
  const e = easeOutCubic(prog(f, delay, dur));
  return {
    opacity: e,
    transform: `translateY(${(1 - e) * dist}px)`,
    filter: e < 1 ? `blur(${(1 - e) * 9}px)` : undefined,
  };
};

/* Accent glow: flares on appearance, settles to nothing */
const glowFilter = (f: number, delay: number, blurPx = 0) => {
  const t = f - delay;
  const a = t < 0 ? 0 : t < 8 ? easeOutCubic(t / 8) * 0.55 : 0.55 * (1 - easeInOutQuart((t - 8) / 22));
  const parts: string[] = [];
  if (blurPx > 0.01) parts.push(`blur(${blurPx}px)`);
  if (a > 0.005) parts.push(`drop-shadow(0 0 ${18 + a * 30}px rgba(90,170,255,${a}))`);
  return parts.length ? parts.join(' ') : undefined;
};

const gradText: React.CSSProperties = {
  backgroundImage: GRAD,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  display: 'inline-block',
};

/* A single line of text with the standard reveal */
const Line: React.FC<{
  f: number;
  delay: number;
  dur?: number;
  style?: React.CSSProperties;
  accent?: boolean;
  children: React.ReactNode;
}> = ({f, delay, dur = 13, style, accent, children}) => {
  const r = reveal(f, delay, dur);
  const e = easeOutCubic(prog(f, delay, dur));
  if (accent) {
    return (
      <div style={{...style, opacity: r.opacity, transform: r.transform}}>
        <span style={{...gradText, filter: glowFilter(f, delay, (1 - e) * 9), paddingBottom: '0.08em'}}>{children}</span>
      </div>
    );
  }
  return <div style={{...style, ...r}}>{children}</div>;
};

const Label: React.FC<{f: number; delay: number; children: React.ReactNode; top: number; color?: string}> = ({
  f,
  delay,
  children,
  top,
  color = SILVER,
}) => {
  const e = easeOutCubic(prog(f, delay, 12));
  return (
    <div style={{position: 'absolute', left: LEFT, top, display: 'flex', alignItems: 'center', gap: 22, opacity: e}}>
      <div style={{width: 44 * e, height: 3, backgroundImage: GRAD, borderRadius: 2}} />
      <div style={{fontFamily: TEXT, fontWeight: 600, fontSize: 28, letterSpacing: '0.28em', color}}>{children}</div>
    </div>
  );
};

/* ───────── Background ───────── */
const Background: React.FC<{frame: number}> = ({frame}) => (
  <AbsoluteFill style={{backgroundColor: BG}}>
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse 900px 800px at 92% 4%, rgba(47,107,255,0.10) 0%, rgba(47,107,255,0.045) 38%, rgba(47,107,255,0) 72%)',
      }}
    />
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.026}}>
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 24} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

const BrandMark: React.FC<{o: number}> = ({o}) => (
  <div
    style={{
      opacity: o,
      position: 'absolute',
      left: LEFT,
      top: 1452,
      fontFamily: TEXT,
      fontWeight: 600,
      fontSize: 22,
      letterSpacing: '0.32em',
      color: MUTED,
    }}
  >
    NGCX INTELLIGENCE
  </div>
);

/* ───────── Scene 1 – Hook ───────── */
const S1: React.FC<{f: number}> = ({f}) => {
  const big: React.CSSProperties = {
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: 98,
    lineHeight: 1.1,
    letterSpacing: '-0.025em',
    color: WHITE,
  };
  return (
    <AbsoluteFill>
      <Label f={f} delay={0} top={560}>
        PROJEKTMARGE
      </Label>
      <div style={{position: 'absolute', left: LEFT, top: 640, width: CONTENT_W}}>
        <Line f={f} delay={0} dur={6} style={big}>
          Deine Agentur
        </Line>
        <Line f={f} delay={2} dur={6} style={big}>
          verliert Geld.
        </Line>
        <div style={{height: 46}} />
        <Line f={f} delay={18} style={big} accent>
          Nur nicht da,
        </Line>
        <Line f={f} delay={21} style={big} accent>
          wo du hinschaust.
        </Line>
      </div>
    </AbsoluteFill>
  );
};

/* ───────── Scene 2 – Studie ───────── */
const S2: React.FC<{f: number}> = ({f}) => {
  const c = easeOutCubic(prog(f, 3, 30));
  const val = Math.round(27 * c);
  const e = easeOutCubic(prog(f, 0, 12));
  const line = easeInOutQuart(prog(f, 30, 18));
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: LEFT - 8,
          top: 470,
          opacity: e,
          transform: `translateY(${(1 - e) * 26}px)`,
          fontFamily: DISPLAY,
          fontWeight: 700,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            ...gradText,
            fontSize: 360,
            fontVariantNumeric: 'tabular-nums',
            filter: glowFilter(f, 30, (1 - e) * 9),
            paddingBottom: 20,
          }}
        >
          <span style={{fontSize: 150, letterSpacing: 0, verticalAlign: '0.62em', marginRight: 18}}>Ø</span>
          {val}
          <span style={{fontSize: 220, marginLeft: 22}}>%</span>
        </span>
      </div>
      <div style={{position: 'absolute', left: LEFT, top: 905, width: CONTENT_W}}>
        <Line
          f={f}
          delay={12}
          style={{fontFamily: DISPLAY, fontWeight: 600, fontSize: 72, letterSpacing: '-0.02em', color: WHITE}}
        >
          über Budget im Schnitt.
        </Line>
      </div>
      <div style={{position: 'absolute', left: LEFT, top: 1040, width: CONTENT_W * line, height: 2, background: '#22252B'}} />
      <div style={{position: 'absolute', left: LEFT, top: 1074, width: CONTENT_W}}>
        <Line f={f} delay={34} style={{fontFamily: TEXT, fontWeight: 500, fontSize: 31, color: SILVER, letterSpacing: '0.005em'}}>
          2.092 IT-Projekte · McKinsey & Universität Oxford
        </Line>
      </div>
    </AbsoluteFill>
  );
};

/* ───────── Scene 3 – Twist ───────── */
const S3: React.FC<{f: number}> = ({f}) => {
  const st: React.CSSProperties = {
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: 90,
    lineHeight: 1.12,
    letterSpacing: '-0.025em',
    color: WHITE,
    whiteSpace: 'nowrap',
  };
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: LEFT, top: 600, width: CONTENT_W}}>
        <Line f={f} delay={2} style={st}>
          Kleine Projekte
        </Line>
        <Line f={f} delay={5} style={st}>
          reißen ihr Budget
        </Line>
        <Line f={f} delay={11} style={st} accent>
          prozentual stärker
        </Line>
        <Line f={f} delay={14} style={st} accent>
          als große.
        </Line>
      </div>
    </AbsoluteFill>
  );
};

/* ───────── Scene 4/5 shared geometry ───────── */
const SCALE = CONTENT_W / 162000; // px per € – same scale in scenes 4 + 5
const BAR_H = 56;
const BAR_A_Y = 660;
const W_A = 81000 * SCALE; // 440
const W_B = 8100 * SCALE; // 44
const EXAMPLE_LABEL = 'RECHENBEISPIEL · Ø 27 % ÜBER BUDGET';

const ValueText: React.FC<{text: string; x: number; y: number; accent: boolean; size: number; f: number; delay: number; op: number}> = ({
  text,
  x,
  y,
  accent,
  size,
  f,
  delay,
  op,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      opacity: op,
      fontFamily: DISPLAY,
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1,
      letterSpacing: '-0.02em',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
    }}
  >
    {accent ? <span style={{...gradText, filter: glowFilter(f, delay), paddingBottom: 6}}>{text}</span> : <span style={{color: SILVER}}>{text}</span>}
  </div>
);

/* ───────── Scene 4 – Vergleich ───────── */
const S4: React.FC<{f: number}> = ({f}) => {
  const ga = easeInOutQuart(prog(f, 10, 30));
  const gb = easeInOutQuart(prog(f, 56, 16));
  const small: React.CSSProperties = {fontFamily: TEXT, fontWeight: 500, fontSize: 36, color: SILVER};
  const B_Y = 1020;
  return (
    <AbsoluteFill>
      <Label f={f} delay={0} top={390} color={MUTED}>
        {EXAMPLE_LABEL}
      </Label>
      {/* Row A */}
      <div style={{position: 'absolute', left: LEFT, top: BAR_A_Y - 82}}>
        <Line f={f} delay={3} style={{...small, color: WHITE}}>
          300.000{NB}€ Projekt
        </Line>
      </div>
      <div
        style={{
          position: 'absolute',
          left: LEFT,
          top: BAR_A_Y,
          width: Math.max(0, W_A * ga),
          height: BAR_H,
          backgroundImage: GRAD,
          borderRadius: 4,
          boxShadow: `0 0 ${40 * ga}px rgba(90,170,255,${0.28 * (1 - prog(f, 40, 24))})`,
        }}
      />
      <ValueText
        text={`+${NB}${de(81000 * ga)}${NB}€`}
        x={LEFT + W_A * ga + 30}
        y={BAR_A_Y - 2}
        accent
        size={62}
        f={f}
        delay={36}
        op={easeOutCubic(prog(f, 10, 8))}
      />
      <div style={{position: 'absolute', left: LEFT, top: BAR_A_Y + 92}}>
        <Line f={f} delay={40} style={{fontFamily: DISPLAY, fontWeight: 600, fontSize: 52, color: WHITE, letterSpacing: '-0.015em'}}>
          Alarm. Krisenmeeting.
        </Line>
      </div>

      {/* Row B */}
      <div style={{position: 'absolute', left: LEFT, top: B_Y - 82}}>
        <Line f={f} delay={50} style={small}>
          30.000{NB}€ Projekt
        </Line>
      </div>
      <div
        style={{
          position: 'absolute',
          left: LEFT,
          top: B_Y,
          width: Math.max(0, W_B * gb),
          height: BAR_H,
          background: '#3A3E46',
          borderRadius: 4,
        }}
      />
      <ValueText
        text={`+${NB}${de(8100 * gb)}${NB}€`}
        x={LEFT + W_B * gb + 30}
        y={B_Y - 2}
        accent={false}
        size={62}
        f={f}
        delay={0}
        op={easeOutCubic(prog(f, 56, 8))}
      />
      <div style={{position: 'absolute', left: LEFT, top: B_Y + 92}}>
        <Line f={f} delay={74} style={{fontFamily: DISPLAY, fontWeight: 500, fontSize: 46, color: MUTED, letterSpacing: '-0.01em'}}>
          Schulterzucken.
        </Line>
      </div>
    </AbsoluteFill>
  );
};

/* ───────── Scene 5 – Summe ───────── */
const S5: React.FC<{f: number}> = ({f}) => {
  const COLS = 5;
  const TILE = 92;
  const GAP = 30;
  const GRID_Y = 900;
  const SUM_Y = BAR_A_Y + BAR_H + 34; // directly under the 81k bar
  const SEG = CONTENT_W / 20;
  const ghost = easeInOutQuart(prog(f, 2, 16)); // 81k bar blue → muted
  const numP = easeOutCubic(prog(f, 62, 30));
  const tiles = [];
  for (let i = 0; i < 20; i++) {
    const appear = easeOutCubic(prog(f, 8 + i * 1.6, 10));
    const fly = easeInOutQuart(prog(f, 46 + (i % COLS) * 0.8 + Math.floor(i / COLS) * 0.6, 18));
    const gx = LEFT + (i % COLS) * (TILE + GAP);
    const gy = GRID_Y + Math.floor(i / COLS) * (TILE + GAP);
    const tx = LEFT + i * SEG;
    const x = lerp(gx, tx, fly);
    const y = lerp(gy + (1 - appear) * 22, SUM_Y, fly);
    const w = lerp(TILE, SEG - 3, fly);
    const h = lerp(TILE, BAR_H, fly);
    const r = lerp(10, 2, fly);
    tiles.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius: r,
          opacity: appear,
          background: '#3A3E46',
          overflow: 'hidden',
          filter: fly > 0 && fly < 1 ? `blur(${Math.sin(Math.PI * fly) * 3}px)` : undefined,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: GRAD,
            backgroundSize: `${CONTENT_W}px 100%`,
            backgroundPosition: `${-(i * SEG)}px 0`,
            opacity: fly,
          }}
        />
      </div>,
    );
  }
  const sumGlow = f >= 64 ? 0.3 * (1 - prog(f, 72, 24)) : 0;
  const muted = (c1: number[], c2: number[]) => c1.map((v, k) => Math.round(lerp(v, c2[k], ghost)));
  const c1 = muted([47, 107, 255], [42, 45, 52]);
  const c2 = muted([90, 170, 255], [42, 45, 52]);
  return (
    <AbsoluteFill>
      <Label f={f} delay={-20} top={390} color={MUTED}>
        {EXAMPLE_LABEL}
      </Label>
      <div style={{position: 'absolute', left: LEFT, top: 472, width: CONTENT_W}}>
        <Line f={f} delay={4} style={{fontFamily: DISPLAY, fontWeight: 600, fontSize: 60, lineHeight: 1.15, color: WHITE, letterSpacing: '-0.02em'}}>
          20{NB}×{NB}8.100{NB}€,
        </Line>
        <Line f={f} delay={7} style={{fontFamily: DISPLAY, fontWeight: 600, fontSize: 60, lineHeight: 1.15, color: SILVER, letterSpacing: '-0.02em'}}>
          die niemand bemerkt.
        </Line>
      </div>
      {/* 81k bar from scene 4 (match cut), dimmed */}
      <div
        style={{
          position: 'absolute',
          left: LEFT,
          top: BAR_A_Y,
          width: W_A,
          height: BAR_H,
          borderRadius: 4,
          backgroundImage: `linear-gradient(90deg, rgb(${c1.join(',')}), rgb(${c2.join(',')}))`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: LEFT + W_A + 30,
          top: BAR_A_Y + 12,
          fontFamily: TEXT,
          fontWeight: 500,
          fontSize: 30,
          color: MUTED,
          opacity: ghost,
          whiteSpace: 'nowrap',
        }}
      >
        +{NB}81.000{NB}€
      </div>
      {/* sum bar glow layer */}
      <div
        style={{
          position: 'absolute',
          left: LEFT,
          top: SUM_Y,
          width: CONTENT_W,
          height: BAR_H,
          borderRadius: 4,
          boxShadow: `0 0 48px rgba(90,170,255,${sumGlow})`,
        }}
      />
      {tiles}
      <div style={{position: 'absolute', left: LEFT - 6, top: 860, opacity: easeOutCubic(prog(f, 62, 10))}}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 168,
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{...gradText, filter: glowFilter(f, 64), paddingBottom: 12}}>
            {de(162000 * numP)}
            {NB}€
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ───────── Scene 6 – These ───────── */
const S6: React.FC<{f: number}> = ({f}) => (
  <AbsoluteFill>
    <div style={{position: 'absolute', left: LEFT, top: 700, width: CONTENT_W}}>
      <Line f={f} delay={3} style={{fontFamily: DISPLAY, fontWeight: 600, fontSize: 64, color: SILVER, letterSpacing: '-0.02em'}}>
        Kein Projektproblem.
      </Line>
      <div style={{height: 30}} />
      <Line f={f} delay={18} style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 86, lineHeight: 1.08, color: WHITE, letterSpacing: '-0.03em'}}>
        Ein
      </Line>
      <Line f={f} delay={21} style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 86, lineHeight: 1.08, color: WHITE, letterSpacing: '-0.03em', whiteSpace: 'nowrap'}}>
        Sichtbarkeitsproblem.
      </Line>
    </div>
  </AbsoluteFill>
);

/* ───────── Scene 7 – Endkarte ───────── */
const S7: React.FC<{f: number}> = ({f}) => {
  const words = ['KNOW.', 'DECIDE.', 'GROW.'];
  const e = easeOutCubic(prog(f, 2, 16));
  const e2 = easeOutCubic(prog(f, 10, 16));
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center'}}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 210,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: WHITE,
            opacity: e,
            transform: `translateY(${(1 - e) * 26}px) scale(${1.04 - 0.04 * e})`,
            filter: e < 1 ? `blur(${(1 - e) * 10}px)` : undefined,
          }}
        >
          NGCX
        </div>
        <div
          style={{
            marginTop: 30,
            fontFamily: TEXT,
            fontWeight: 600,
            fontSize: 34,
            letterSpacing: '0.62em',
            paddingLeft: '0.62em',
            color: SILVER,
            opacity: e2,
            filter: e2 < 1 ? `blur(${(1 - e2) * 6}px)` : undefined,
          }}
        >
          INTELLIGENCE
        </div>
        <div style={{marginTop: 120, display: 'flex', justifyContent: 'center', gap: 30}}>
          {words.map((w, i) => {
            const d = 26 + i * 8;
            const r = reveal(f, d, 13, 18);
            return (
              <div key={w} style={{opacity: r.opacity, transform: r.transform}}>
                <span
                  style={{
                    ...gradText,
                    fontFamily: TEXT,
                    fontWeight: 700,
                    fontSize: 38,
                    letterSpacing: '0.2em',
                    filter: glowFilter(f, d, (1 - easeOutCubic(prog(f, d, 13))) * 8),
                  }}
                >
                  {w}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: LEFT,
          right: LEFT,
          top: 1430,
          textAlign: 'center',
          fontFamily: TEXT,
          fontWeight: 500,
          fontSize: 24,
          color: MUTED,
          opacity: easeOutCubic(prog(f, 44, 14)),
        }}
      >
        Quelle: McKinsey & Universität Oxford (2013), via CIO.de
      </div>
    </AbsoluteFill>
  );
};

/* ───────── Transitions ───────── */
const SCENE_COMPONENTS = [S1, S2, S3, S4, S5, S6, S7];
const MATCH_CUT_AFTER = 3; // scene index 3 → 4 is a match cut (81k bar stays in place)

const SceneWrap: React.FC<{idx: number; frame: number}> = ({idx, frame}) => {
  const {start, end} = SCENES[idx];
  const f = frame - start;
  const C = SCENE_COMPONENTS[idx];
  let opacity = 1;
  let tx = 0;
  let mblur = 0;
  const isFirst = idx === 0;
  const isLast = idx === SCENES.length - 1;
  // enter
  if (!isFirst && frame < start + H) {
    const p = prog(frame, start - H, 2 * H);
    if (idx - 1 === MATCH_CUT_AFTER) {
      opacity = easeInOutQuart(p);
    } else {
      const e = easeOutCubic(p);
      opacity = e;
      tx = (1 - e) * 170;
      mblur = Math.sin(Math.PI * Math.min(1, p + 0.5)) * 26 * (1 - e) + (1 - e) * 10;
    }
  }
  // exit
  if (!isLast && frame >= end - H) {
    const p = prog(frame, end - H, 2 * H);
    if (idx === MATCH_CUT_AFTER) {
      opacity = 1 - easeInOutQuart(p);
    } else {
      const e = easeInCubic(p);
      opacity = 1 - e;
      tx = -e * 170;
      mblur = e * 30;
    }
  }
  const fid = `mb${idx}`;
  return (
    <AbsoluteFill style={{opacity, transform: `translateX(${tx}px)`, filter: mblur > 0.3 ? `url(#${fid})` : undefined}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={fid} x="-20%" y="0" width="140%" height="100%">
          <feGaussianBlur stdDeviation={`${mblur} 0`} />
        </filter>
      </svg>
      <C f={f} />
    </AbsoluteFill>
  );
};

export const Reel: React.FC = () => {
  const frame = useCurrentFrame();
  const visible = SCENES.map((s, i) => i).filter((i) => {
    const s = SCENES[i];
    const lo = i === 0 ? 0 : s.start - H;
    const hi = i === SCENES.length - 1 ? TOTAL : s.end + H;
    return frame >= lo && frame < hi;
  });
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <Background frame={frame} />
      {visible.map((i) => (
        <SceneWrap key={i} idx={i} frame={frame} />
      ))}
      <BrandMark o={1 - prog(frame, SCENES[6].start - H, 2 * H)} />
    </AbsoluteFill>
  );
};
