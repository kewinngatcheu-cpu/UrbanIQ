import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { C } from "../brand";
import { rand } from "./anim";

type Pt = { x: number; y: number; z: number; tx: number; ty: number; tz: number; signal: boolean; seed: number };

type Props = {
  W: number;
  H: number;
  count?: number;
  seed?: number;
  /** 0 = nothing, 1 = fully revealed (reveal grows outward from the centre line). */
  reveal: number;
  /** 0 = organic cloud, 1 = ordered lattice (the "intelligence" state). */
  order?: number;
  /** radians of camera yaw */
  yaw: number;
  pitch?: number;
  /** camera distance multiplier (smaller = pushed in) */
  zoom?: number;
  /** how strongly blue "signal" nodes are highlighted */
  signalBoost?: number;
  pulses?: number;
  opacity?: number;
  spread?: [number, number, number];
};

/**
 * True 3D point network projected in perspective. Silver structure,
 * electric-blue signal nodes, light pulses travelling along connections.
 */
export const NetworkField: React.FC<Props> = ({
  W,
  H,
  count = 140,
  seed = 1,
  reveal,
  order = 0,
  yaw,
  pitch = -0.18,
  zoom = 1,
  signalBoost = 1,
  pulses = 1,
  opacity = 1,
  spread = [1.6, 0.8, 1.2],
}) => {
  const frame = useCurrentFrame();
  const { pts, edges, grid } = useMemo(() => {
    const pts: Pt[] = [];
    const cols = Math.ceil(Math.sqrt(count * 1.6));
    for (let i = 0; i < count; i++) {
      const r1 = rand(seed * 1000 + i * 3.1);
      const r2 = rand(seed * 2000 + i * 7.7);
      const r3 = rand(seed * 3000 + i * 1.3);
      // ordered target: a calm, layered lattice (three planes)
      const layer = i % 3;
      const k = Math.floor(i / 3);
      const gx = (k % cols) / (cols - 1) - 0.5;
      const gy = Math.floor(k / cols) / Math.max(1, Math.ceil(count / 3 / cols) - 1) - 0.5;
      pts.push({
        x: (r1 - 0.5) * 2 * spread[0],
        y: (r2 - 0.5) * 2 * spread[1],
        z: (r3 - 0.5) * 2 * spread[2],
        tx: gx * 2.6,
        ty: (layer - 1) * 0.42 + gy * 0.25,
        tz: gy * 1.6,
        signal: rand(seed * 5000 + i) > 0.9,
        seed: i,
      });
    }
    const edges: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      const near = pts
        .map((p, j) => ({ j, d: (p.x - pts[i].x) ** 2 + (p.y - pts[i].y) ** 2 + (p.z - pts[i].z) ** 2 }))
        .filter((o) => o.j > i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      near.forEach((o) => edges.push([i, o.j]));
    }
    // lattice neighbours used once the field is "ordered"
    const grid: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      const k = Math.floor(i / 3);
      if (k % cols !== cols - 1 && i + 3 < count) grid.push([i, i + 3]);
      if (i + 3 * cols < count) grid.push([i, i + 3 * cols]);
    }
    return { pts, edges, grid };
  }, [count, seed, spread]);

  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const focal = Math.min(W, H) * 0.95;
  const camD = 3.4 * zoom;
  const ease = order * order * (3 - 2 * order);

  const proj = pts.map((p, i) => {
    const drift = 0.04 * Math.sin(frame / 40 + p.seed);
    let x = p.x + (p.tx - p.x) * ease;
    let y = p.y + (p.ty - p.y) * ease + drift * (1 - ease);
    let z = p.z + (p.tz - p.z) * ease;
    // yaw then pitch
    const x1 = x * cy - z * sy;
    const z1 = x * sy + z * cy;
    const y1 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    const depth = z2 + camD;
    const s = focal / depth;
    // reveal grows outward from the horizontal centre line
    const dist = Math.abs(p.x) / spread[0];
    const vis = Math.max(0, Math.min(1, (reveal * 1.25 - dist) * 4));
    x = W / 2 + x1 * s;
    y = H / 2 + y1 * s;
    return { x, y, s, depth, vis, signal: p.signal, i };
  });

  const nearFade = (d: number) => Math.max(0, Math.min(1, (d - 0.6) / 1.2)) * Math.max(0, Math.min(1, (7 - d) / 3));

  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity }}>
      <defs>
        <radialGradient id={`halo${seed}`}>
          <stop offset="0%" stopColor={C.blue} stopOpacity={0.55} />
          <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
        </radialGradient>
      </defs>
      {edges.map(([a, b], k) => {
        const A = proj[a], B = proj[b];
        const v = Math.min(A.vis, B.vis) * nearFade((A.depth + B.depth) / 2);
        if (v <= 0.01) return null;
        const sig = pts[a].signal || pts[b].signal;
        return (
          <line
            key={k}
            x1={A.x}
            y1={A.y}
            x2={B.x}
            y2={B.y}
            stroke={sig ? C.blue : C.silver}
            strokeOpacity={(sig ? 0.35 * signalBoost : 0.09) * v * (1 - 0.9 * ease)}
            strokeWidth={sig ? 1.2 : 0.8}
          />
        );
      })}
      {ease > 0.01 &&
        grid.map(([a, b], k) => {
          const A = proj[a], B = proj[b];
          const v = Math.min(A.vis, B.vis) * nearFade((A.depth + B.depth) / 2) * ease;
          if (v <= 0.01) return null;
          return <line key={`g${k}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={C.silver} strokeOpacity={0.16 * v} strokeWidth={0.8} />;
        })}
      {ease > 0.3 &&
        grid.map(([a, b], k) => {
          if (k % 4 !== 0) return null;
          const A = proj[a], B = proj[b];
          const v = Math.min(A.vis, B.vis) * nearFade((A.depth + B.depth) / 2) * (ease - 0.3) / 0.7 * pulses;
          const t = ((frame * 1.6 + rand(k + 7) * 60) % 60) / 60;
          return <circle key={`gp${k}`} cx={A.x + (B.x - A.x) * t} cy={A.y + (B.y - A.y) * t} r={1.8} fill={C.cyan} opacity={v * Math.sin(t * Math.PI)} />;
        })}
      {pulses > 0 &&
        edges.map(([a, b], k) => {
          if (k % 5 !== 0) return null;
          const A = proj[a], B = proj[b];
          const v = Math.min(A.vis, B.vis) * nearFade((A.depth + B.depth) / 2) * pulses * (1 - ease);
          if (v <= 0.02) return null;
          const t = ((frame + rand(k) * 90) % 90) / 90;
          const x = A.x + (B.x - A.x) * t;
          const y = A.y + (B.y - A.y) * t;
          return <circle key={`p${k}`} cx={x} cy={y} r={1.6} fill={C.cyan} opacity={v * Math.sin(t * Math.PI) * 0.9} />;
        })}
      {proj.map((p) => {
        const v = p.vis * nearFade(p.depth);
        if (v <= 0.01) return null;
        const r = Math.max(0.8, p.s * (p.signal ? 0.012 : 0.007));
        if (p.signal) {
          return (
            <g key={p.i} opacity={v}>
              <circle cx={p.x} cy={p.y} r={r * 7 * signalBoost} fill={`url(#halo${seed})`} />
              <circle cx={p.x} cy={p.y} r={r} fill={C.ice} />
              <circle cx={p.x} cy={p.y} r={r * 2.2} fill="none" stroke={C.blue} strokeOpacity={0.7 * signalBoost} strokeWidth={1} />
            </g>
          );
        }
        return <circle key={p.i} cx={p.x} cy={p.y} r={r} fill={C.silver} opacity={v * (0.35 + 0.4 / p.depth)} />;
      })}
    </svg>
  );
};
