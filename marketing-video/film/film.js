/* ONE — launch film. Every frame is a pure function of time: window.seek(t).
 * Formats: ?format=16x9 (1920×1080, default) or ?format=9x16 (1080×1920). Preview: ?play=1, still: ?t=12.5
 */
(() => {
  const Q = new URLSearchParams(location.search);
  const V = Q.get("format") === "9x16";
  const W = V ? 1080 : 1920, H = V ? 1920 : 1080;
  const P = (h, v) => (V ? v : h);
  const { K, S } = TL;
  const I = window.ICONS;
  const SCR = "../assets/screens/";

  // ───────────────────────── math ─────────────────────────
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    inCubic: (p) => p * p * p,
    io: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inExpo: (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
    ioExpo: (p) => (p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2),
    outBack: (p) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    outQuint: (p) => 1 - Math.pow(1 - p, 5),
  };
  /** damped spring response for dt seconds since start (0 → 1 with a soft overshoot) */
  const spring = (dt, k = 7, f = 9) => (dt <= 0 ? 0 : 1 - Math.exp(-k * dt) * Math.cos(f * dt));
  const ease = (t, a, b, fn = E.outCubic) => fn(prog(t, a, b));
  /** visibility window: fades in after a, out before b */
  const win = (t, a, b, fi = 0.4, fo = 0.4) => Math.min(ease(t, a, a + fi), 1 - ease(t, b - fo, b, E.inCubic));
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }

  // ───────────────────────── dom ─────────────────────────
  const stage = document.getElementById("stage");
  stage.style.width = W + "px";
  stage.style.height = H + "px";
  function el(html, parent) { const t = document.createElement("template"); t.innerHTML = html.trim(); const e = t.content.firstElementChild; (parent || stage).appendChild(e); return e; }
  const ic = (n) => I[n];
  function pos(e, o = {}) {
    const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, sx = 1, o: op = 1, blur = 0 } = o;
    const anchor = e.dataset.tl ? "" : "translate(-50%,-50%) ";
    e.style.transform = `${anchor}translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${(s * sx).toFixed(4)},${s.toFixed(4)})`;
    e.style.opacity = clamp(op).toFixed(3);
    e.style.filter = blur > 0.08 ? `blur(${blur.toFixed(2)}px)` : "none";
    e.style.visibility = op <= 0.002 ? "hidden" : "visible";
  }
  function layer(cls = "") { return el(`<div class="layer ${cls}"></div>`); }
  function world(parent) { return el(`<div class="world"></div>`, parent); }

  /** Headline with per-word animation. "*word*" → gradient word, "\n" → line break */
  function headline(parent, text, size, extra = "") {
    const e = el(`<div class="c hl ${extra}" style="font-size:${size}px"></div>`, parent);
    let g = false;
    text.split("\n").forEach((line, li, arr) => {
      line.split(" ").forEach((w) => {
        const s = document.createElement("span");
        if (w.startsWith("*")) g = true;
        s.className = "w" + (g ? " grad" : "");
        s.textContent = w.replace(/\*/g, "");
        if (/\*[.,!?]?$/.test(w)) g = false;
        e.appendChild(s);
        e.appendChild(document.createTextNode(" "));
      });
      if (li < arr.length - 1) e.appendChild(document.createElement("br"));
    });
    e.spans = [...e.querySelectorAll(".w")];
    return e;
  }
  function words(e, t, a, b, { st = 0.075, dur = 0.75, dy = 34, blur = 16, out = 0.5, outDy = -24 } = {}) {
    e.spans.forEach((s, i) => {
      const p = ease(t, a + i * st, a + i * st + dur, E.outQuint);
      const q = ease(t, b - out + i * 0.03, b + i * 0.03, E.inCubic);
      s.style.opacity = (p * (1 - q)).toFixed(3);
      s.style.transform = `translateY(${((1 - p) * dy + q * outDy).toFixed(2)}px)`;
      const bl = (1 - p) * blur + q * blur * 0.8;
      s.style.filter = bl > 0.1 ? `blur(${bl.toFixed(2)}px)` : "none";
    });
    e.style.visibility = t > a - 0.05 && t < b + 0.3 ? "visible" : "hidden";
  }
  function eyebrow(parent, n, label) {
    return el(`<div class="c eyebrow"><span class="n">${n}</span><span class="ln"></span><span>${label}</span></div>`, parent);
  }
  function eyebrowAnim(e, t, a, b, x, y) {
    const p = ease(t, a, a + 0.8, E.outQuint), q = ease(t, b - 0.4, b, E.inCubic);
    pos(e, { x: x + (1 - p) * -30, y, o: p * (1 - q), blur: (1 - p) * 8 });
  }
  const typed = (text, t, [a, b]) => text.slice(0, Math.round(text.length * prog(t, a, b)));

  // ───────────────────────── background ─────────────────────────
  const bg = layer("bg-base");
  const blobs = [
    { c: "#cfe6ff", r: 1100, x: -0.25, y: -0.3, sp: 0.07, a: 0.9 },
    { c: "#e4ddff", r: 900, x: 0.32, y: -0.15, sp: 0.05, a: 0.55 },
    { c: "#d9f4ea", r: 800, x: 0.2, y: 0.38, sp: 0.06, a: 0.5 },
    { c: "#c4e1ff", r: 950, x: -0.35, y: 0.35, sp: 0.045, a: 0.6 },
    { c: "#ffece0", r: 600, x: 0.45, y: 0.42, sp: 0.08, a: 0.25 },
  ].map((b) => ({ ...b, e: el(`<div class="blob" style="width:${b.r}px;height:${b.r}px;background:${b.c}"></div>`, bg) }));
  const vignette = el(`<div class="layer" style="background:radial-gradient(130% 100% at 50% 45%, rgba(255,255,255,0) 55%, rgba(214,228,243,.55) 100%)"></div>`, bg);
  function updateBg(t) {
    const life = 0.45 + 0.55 * ease(t, K.impact - 0.2, K.impact + 1.2);
    blobs.forEach((b, i) => {
      const x = W / 2 + b.x * W + Math.sin(t * b.sp * 6 + i) * 120 - b.r / 2;
      const y = H / 2 + b.y * H + Math.cos(t * b.sp * 5 + i * 2) * 90 - b.r / 2;
      b.e.style.transform = `translate(${x}px,${y}px) scale(${1 + 0.08 * Math.sin(t * 0.3 + i)})`;
      b.e.style.opacity = (b.a * life).toFixed(3);
    });
    vignette.style.opacity = (0.9 - 0.5 * ease(t, K.impact, K.impact + 1)).toFixed(3);
  }

  // FX canvas (dust, bursts)
  const fxLayer = layer();
  const cv = el(`<canvas width="${W}" height="${H}" class="layer"></canvas>`, fxLayer);
  const cx = cv.getContext("2d");
  const R = rng(42);
  const dust = Array.from({ length: 140 }, () => ({ x: (R() - 0.5) * W * 1.2, y: (R() - 0.5) * H * 1.2, r: 0.8 + R() * 2.4, sp: 0.2 + R() * 0.8, ph: R() * 6.28, a: 0.15 + R() * 0.4 }));
  const bursts = [];
  function burst(t0, x, y, n, colors, speed = 700, seed = 7) {
    const r = rng(seed);
    bursts.push({ t0, x, y, parts: Array.from({ length: n }, () => ({ ang: r() * 6.283, v: speed * (0.35 + r() * 0.75), s: 2 + r() * 5, c: colors[Math.floor(r() * colors.length)], rot: r() * 6, sq: r() > 0.55 })) });
  }
  function updateFx(t) {
    cx.clearRect(0, 0, W, H);
    // dust: pulled into the core during the implosion, blown out by the impact
    const pull = ease(t, K.implode, K.impact, E.inCubic);
    const blow = t > K.impact ? E.outCubic(prog(t, K.impact, K.impact + 2.2)) : 0;
    for (const d of dust) {
      let x = d.x + Math.sin(t * d.sp + d.ph) * 40 + t * 6 * d.sp;
      let y = d.y + Math.cos(t * d.sp * 0.8 + d.ph) * 30 - t * 4 * d.sp;
      const ang = pull * 2.2;
      const k = 1 - pull * 0.97;
      let px = (x * Math.cos(ang) - y * Math.sin(ang)) * k, py = (x * Math.sin(ang) + y * Math.cos(ang)) * k;
      if (t > K.impact) { const f = 0.03 + blow * 0.97; px = x * f * (1 + 0.15 * (1 - blow)); py = y * f; }
      const a = d.a * (t < K.impact ? 0.6 + pull * 0.4 : 0.4 + 0.6 * blow) * (V ? 1 : 1);
      cx.beginPath(); cx.fillStyle = `rgba(106,175,232,${a.toFixed(3)})`;
      cx.arc(W / 2 + px, H / 2 + py, d.r, 0, 6.283); cx.fill();
    }
    for (const b of bursts) {
      const dt = t - b.t0; if (dt < 0 || dt > 2.2) continue;
      const fade = 1 - prog(dt, 0.6, 2.2);
      for (const p of b.parts) {
        const dist = p.v * (1 - Math.exp(-dt * 3.2)) / 3.2 * 3;
        const x = b.x + Math.cos(p.ang) * dist, y = b.y + Math.sin(p.ang) * dist + dt * dt * 60;
        cx.save(); cx.globalAlpha = fade; cx.fillStyle = p.c; cx.translate(x, y); cx.rotate(p.rot + dt * 4);
        if (p.sq) cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); else { cx.beginPath(); cx.arc(0, 0, p.s / 2, 0, 6.283); cx.fill(); }
        cx.restore();
      }
    }
  }

  // ───────────────────────── ONE logo mark (from components/brand/logo.tsx, animated) ─────────────────────────
  function makeMark(parent, size, id) {
    const e = el(`<div class="c" style="width:${size}px;height:${size}px">
      <div class="tile" style="position:absolute;inset:0;border-radius:${size * 0.28}px;background:linear-gradient(145deg,#ffffff 0%,#eff7ff 55%,#e2f0ff 100%);box-shadow:0 ${size * 0.18}px ${size * 0.45}px -${size * 0.1}px rgba(47,116,181,.45), 0 ${size * 0.03}px ${size * 0.08}px rgba(35,54,77,.08), inset 0 1px 0 #fff, inset 0 -${size * 0.02}px ${size * 0.05}px rgba(106,175,232,.15)"></div>
      <svg viewBox="0 0 32 32" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible">
        <defs>
          <linearGradient id="rg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8cc4f0"/><stop offset="1" stop-color="#438ed4"/></linearGradient>
          <radialGradient id="dg${id}"><stop offset="0" stop-color="#9fd0ff" stop-opacity=".9"/><stop offset="1" stop-color="#6aafe8" stop-opacity="0"/></radialGradient>
        </defs>
        <circle class="ring" cx="16" cy="16" r="8.2" fill="none" stroke="url(#rg${id})" stroke-width="3.2" stroke-linecap="round" transform="rotate(-90 16 16)" stroke-dasharray="51.52" stroke-dashoffset="51.52"/>
        <g class="trail"></g>
        <circle class="glow" r="5.5" fill="url(#dg${id})"/>
        <circle class="dot" r="2.6" fill="#438ED4" stroke="#EFF7FF" stroke-width="1.4"/>
      </svg></div>`, parent);
    const ring = e.querySelector(".ring"), dot = e.querySelector(".dot"), glow = e.querySelector(".glow"), trail = e.querySelector(".trail");
    const ghosts = Array.from({ length: 7 }, () => { const c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); c.setAttribute("fill", "#6aafe8"); trail.appendChild(c); return c; });
    const at = (deg) => { const r = 9.05, a = (deg * Math.PI) / 180; return [16 + r * Math.cos(a), 16 + r * Math.sin(a)]; };
    /** draw: 0..1 ring, orbit: 0..1 dot travel, glowA: 0..1 */
    e.set = (draw, orbit, glowA = 0, dotO = 1) => {
      ring.setAttribute("stroke-dashoffset", (51.52 * (1 - draw)).toFixed(3));
      const deg = -45 - 450 * (1 - orbit);
      const [x, y] = at(deg);
      dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("opacity", dotO);
      glow.setAttribute("cx", x); glow.setAttribute("cy", y); glow.setAttribute("opacity", glowA * dotO);
      const speed = 1 - orbit;
      ghosts.forEach((g, i) => { const [gx, gy] = at(deg - (i + 1) * 9 * Math.min(1, speed * 3)); g.setAttribute("cx", gx); g.setAttribute("cy", gy); g.setAttribute("r", 2.3 - i * 0.25); g.setAttribute("opacity", (dotO * 0.35 * (1 - i / 7) * Math.min(1, speed * 4)).toFixed(3)); });
    };
    return e;
  }

  // ───────────────────────── cursor ─────────────────────────
  const top = layer();
  const cursor = el(`<svg class="cursor" viewBox="0 0 24 24" data-tl="1"><path d="M4 2.5 L4 19.5 L8.6 15.4 L11.6 22 L14.6 20.7 L11.7 14.3 L18 14.3 Z" fill="#fff" stroke="#23364d" stroke-width="1.5" stroke-linejoin="round"/></svg>`, top);
  const ripple = el(`<div class="ripple" data-tl="1"></div>`, top);
  /** cursor path: list of {t, target: () => [x,y] , click?:bool} in stage coords */
  const cursorPath = [];
  function stageScale() { return stage.getBoundingClientRect().width / W; }
  function centerOf(elm, dx = 0, dy = 0) {
    const r = elm.getBoundingClientRect(), sr = stage.getBoundingClientRect(), k = stageScale();
    return [(r.left - sr.left + r.width / 2) / k + dx, (r.top - sr.top + r.height / 2) / k + dy];
  }
  function updateCursor(t) {
    let shown = false;
    for (const seg of cursorPath) {
      if (t < seg.a - 0.3 || t > seg.b + 0.35) continue;
      shown = true;
      const pts = seg.pts.map((p) => ({ ...p, xy: p.target() }));
      let xy = pts[0].xy;
      for (let i = 0; i < pts.length - 1; i++) {
        if (t >= pts[i].t && t <= pts[i + 1].t) { const p = E.io(prog(t, pts[i].t, pts[i + 1].t)); xy = [lerp(pts[i].xy[0], pts[i + 1].xy[0], p), lerp(pts[i].xy[1], pts[i + 1].xy[1], p) - Math.sin(p * Math.PI) * 40]; }
        else if (t > pts[pts.length - 1].t) xy = pts[pts.length - 1].xy;
      }
      const o = Math.min(ease(t, seg.a - 0.3, seg.a), 1 - ease(t, seg.b, seg.b + 0.3));
      let press = 0, rp = -1;
      for (const p of pts) if (p.click) { const d = t - p.t; if (d > -0.08 && d < 0.18) press = 1 - Math.abs(d - 0.04) / 0.14; if (d >= 0 && d < 0.6) rp = d / 0.6; }
      pos(cursor, { x: xy[0] - 6, y: xy[1] - 3, s: 1 - 0.14 * clamp(press), o });
      if (rp >= 0) pos(ripple, { x: xy[0], y: xy[1], s: 0.3 + E.outCubic(rp) * 1.1, o: (1 - rp) * o }); else pos(ripple, { o: 0 });
    }
    if (!shown) { pos(cursor, { o: 0 }); pos(ripple, { o: 0 }); }
  }

  // ═════════════════════════ SCENE 1 — THE PROBLEM ═════════════════════════
  const sc1 = layer();
  const w1 = world(sc1);
  const FR = [
    ["Mail", "Your contract renewal", "Nordlicht Versicherung · 2h", "blue", 3],
    ["FileText", "rental_agreement_final_v3.pdf", "Downloads · 2.4 MB", "fog"],
    ["CalendarDays", "Dentist check-up", "Thursday · 10:30", "lav"],
    ["Bell", "Passport expires", "Reminder · March", "peach"],
    ["StickyNote", "Wi-Fi password?", "Blue notebook… somewhere", "fog"],
    ["Receipt", "Invoice 55-1029", "84.20 EUR · due 20 Nov", "rose"],
    ["SquareCheck", "Call the landlord", "Heating — still broken", "blue"],
    ["MessageCircle", "“Did you cancel the gym?”", "Jonas · now", "mint", 1],
    ["Mail", "Tax documents needed", "Advisor · yesterday", "blue", 5],
    ["Plane", "Lisbon flights", "Price alert · 3 new", "lav"],
    ["CreditCard", "Subscription renewed", "39.90 EUR · FitLife", "rose"],
    ["Clock", "Notice period ends", "30.11.2026", "peach"],
    ["Image", "Scan_0042.jpg", "Camera roll", "fog"],
    ["Lightbulb", "Gift idea for Mum", "Notes app", "mint"],
    ["Mail", "Utility statement", "Haven Properties", "blue", 2],
    ["CalendarDays", "Parents' evening", "Monday · 18:00", "lav"],
    ["Receipt", "Electricity bill", "Stadtwerke", "rose"],
    ["StickyNote", "Pick up dry cleaning", "Sticky note", "fog"],
    ["Bell", "Renew car insurance?", "Reminder", "peach", 1],
    ["FileText", "Insurance letter.pdf", "Mail · unread", "blue"],
    ["SquareCheck", "Book passport appointment", "To-do · overdue", "rose"],
    ["MessageCircle", "“Where's the contract?”", "Family chat", "mint", 12],
    ["Mic", "Voice memo 14", "0:48 · unsorted", "fog"],
    ["Receipt", "Parking fine", "Pay within 14 days", "rose", 1],
  ];
  const r1 = rng(9);
  const frags = FR.map(([icon, t1, s1, tone, badge], i) => {
    const e = el(`<div class="c frag"><span class="chip tone-${tone}">${ic(icon)}</span><div style="min-width:0"><div class="t">${t1}</div><div class="s">${s1}</div></div>${badge ? `<span class="dot">${badge}</span>` : ""}</div>`, w1);
    // distribute on a loose ring around the headline, at varying depth
    const ang = (i / FR.length) * Math.PI * 2 + r1() * 0.5;
    const rx = P(780, 420) * (0.75 + r1() * 0.45), ry = P(400, 800) * (0.7 + r1() * 0.5);
    let z = -700 + r1() * 900;
    let x = Math.cos(ang) * rx, y = Math.sin(ang) * ry;
    if (Math.abs(y) < P(150, 260) && Math.abs(x) < P(600, 420)) z -= 700;
    return { e, x, y, z, vx: (r1() - 0.5) * 40, vy: (r1() - 0.5) * 30, rot: (r1() - 0.5) * 16, ry: (r1() - 0.5) * 30, ph: r1() * 6.28, a: 0.15 + (i % 12) * 0.43 + Math.floor(i / 12) * 0.21, badge: e.querySelector(".dot") };
  });
  const halo1 = el(`<div class="c" style="width:${P(1500, 1000)}px;height:${P(520, 700)}px;background:radial-gradient(closest-side, rgba(255,255,255,.95), rgba(255,255,255,.7) 50%, rgba(255,255,255,0))"></div>`, sc1);
  const h1a = headline(sc1, P("Your life is full of *information.*", "Your life is\nfull of\n*information.*"), P(96, 104));
  const h1b = headline(sc1, P("But where does it all go?", "But where\ndoes it all go?"), P(96, 104));
  const core = el(`<div class="c" style="width:900px;height:900px;border-radius:50%;background:radial-gradient(closest-side, rgba(255,255,255,1) 0%, rgba(188,223,255,.95) 18%, rgba(106,175,232,.45) 40%, rgba(106,175,232,0) 70%)"></div>`, sc1);

  function updateSc1(t) {
    const cam = ease(t, 0, 7.2, (p) => p) * 260;
    const chaos = ease(t, 3.4, 7, E.io);
    frags.forEach((f, i) => {
      const app = spring(t - f.a, 8, 10);
      const wob = 1 + chaos * 2.2;
      let x = f.x + f.vx * t + Math.sin(t * 0.9 + f.ph) * 18 * wob;
      let y = f.y + f.vy * t + Math.cos(t * 1.1 + f.ph) * 14 * wob;
      let z = f.z + cam + Math.sin(t * 0.5 + f.ph) * 40;
      let rz = f.rot + Math.sin(t * 1.3 + f.ph) * 4 * wob, ryy = f.ry + Math.sin(t * 0.7 + f.ph) * 8;
      let s = 0.6 + 0.4 * app, o = clamp(app * 1.2);
      // implosion → everything is pulled into one point
      const st = K.implode + (i % 8) * 0.07;
      const p = ease(t, st, K.impact - 0.05, E.inCubic);
      if (p > 0) {
        const ang = p * 3.2;
        const k = 1 - p;
        const nx = x * Math.cos(ang) - y * Math.sin(ang), ny = x * Math.sin(ang) + y * Math.cos(ang);
        x = nx * k; y = ny * k; z = lerp(z, 0, p); s *= 1 - p * 0.85; rz += p * 35; o *= 1 - ease(p, 0.75, 1);
      }
      const depthBlur = clamp((-z - 250) / 140, 0, 7) + p * 4;
      pos(f.e, { x, y, z, rz, ry: ryy, s, o, blur: depthBlur });
      if (f.badge) f.badge.style.transform = `scale(${spring(t - f.a - 0.25, 9, 14).toFixed(3)})`;
    });
    pos(halo1, { o: 1 - ease(t, 6.6, 7.4) });
    pos(h1a, { y: P(0, -10) }); words(h1a, t, 0.75, 3.65);
    pos(h1b, { y: P(0, -10) }); words(h1b, t, 3.95, 6.8, { out: 0.55 });
    // gravitational core
    const g = ease(t, K.implode + 0.2, K.impact, E.inExpo);
    const after = 1 - ease(t, K.impact, K.impact + 0.9);
    pos(core, { s: 0.05 + g * 0.5 + (t > K.impact ? (1 - after) * 1.6 : 0), o: t < K.impact ? g : after });
  }

  // ═════════════════════════ SCENE 2 — MEET ONE ═════════════════════════
  const sc2 = layer();
  const flash = el(`<div class="layer" style="background:radial-gradient(circle at 50% 50%, #fff 0%, #f3f9ff 40%, rgba(255,255,255,.0) 75%)"></div>`, sc2);
  const shock = el(`<div class="c" style="width:400px;height:400px;border-radius:50%;border:3px solid rgba(106,175,232,.7);box-shadow:0 0 40px rgba(106,175,232,.5), inset 0 0 40px rgba(106,175,232,.35)"></div>`, sc2);
  const shock2 = el(`<div class="c" style="width:400px;height:400px;border-radius:50%;border:1.5px solid rgba(106,175,232,.5)"></div>`, sc2);
  const mark2 = makeMark(sc2, 250, "a");
  const h2 = headline(sc2, "Meet *ONE.*", P(150, 150));
  const h2s = headline(sc2, P("Your Personal Life Operating System.", "Your Personal Life\nOperating System."), P(44, 50));
  h2s.style.fontWeight = 450; h2s.style.letterSpacing = "-0.015em"; h2s.style.color = "#5d6d82"; h2s.style.lineHeight = "1.25";
  const irisRing = el(`<div class="c" style="width:100px;height:100px;border-radius:50%;border:6px solid #8cc4f0;box-shadow:0 0 60px rgba(106,175,232,.8), inset 0 0 60px rgba(106,175,232,.5)"></div>`, sc2);
  const markY = P(-150, -260);
  function updateSc2(t) {
    const f = t < K.impact ? 0 : Math.exp(-(t - K.impact) * 3.2);
    flash.style.opacity = (t >= K.impact ? f * 0.95 : 0).toFixed(3);
    const sp = prog(t, K.impact, K.impact + 1.3);
    pos(shock, { s: 0.2 + E.outExpo(sp) * 5.5, o: (1 - sp) * (t >= K.impact ? 1 : 0) });
    const sp2 = prog(t, K.impact + 0.12, K.impact + 1.6);
    pos(shock2, { s: 0.2 + E.outExpo(sp2) * 3.8, o: (1 - sp2) * (t >= K.impact + 0.12 ? 0.8 : 0) });
    // mark: born at the impact, then moves up for the headline
    const born = spring(t - K.impact, 6.5, 8);
    const up = ease(t, 9.95, 10.75, E.io);
    const out = ease(t, K.iris - 0.05, K.iris + 0.55, E.inCubic);
    const scale = lerp(0.15, 1, born) * lerp(1, 0.62, up);
    pos(mark2, { y: lerp(0, markY, up), s: scale * (1 + out * 2.5), o: t < K.impact ? 0 : clamp(born * 2) * (1 - out), blur: out * 10 });
    mark2.set(ease(t, K.impact + 0.08, K.impact + 0.95, E.outCubic), ease(t, K.impact + 0.15, K.impact + 1.5, E.outCubic), 0.6 + 0.4 * Math.sin(t * 3), 1);
    pos(h2, { y: P(25, -20), s: 1 + out * 0.3 }); words(h2, t, K.meet, K.iris + 0.35, { st: 0.12, dur: 0.9, dy: 40, blur: 20, out: 0.4 });
    pos(h2s, { y: P(150, 170) }); words(h2s, t, K.subtitle, K.iris + 0.3, { st: 0.06, out: 0.35 });
    // iris: a ring of light opens into the product
    const ip = ease(t, K.iris, K.iris + 0.85, E.inOutExpo || E.ioExpo);
    const diam = 60 + ip * Math.hypot(W, H) * 1.15;
    irisRing.style.width = irisRing.style.height = diam + "px";
    irisRing.style.borderWidth = (4 + ip * 30) + "px";
    pos(irisRing, { y: lerp(markY, 0, ip), o: t < K.iris ? 0 : 1 - ease(t, K.iris + 0.5, K.iris + 0.95) });
  }

  // ═════════════════════════ SCENE 3 — REMEMBER ═════════════════════════
  const sc3 = layer();
  el(`<div class="layer bg-base"></div>`, sc3);
  const w3 = world(sc3);
  const eb3 = eyebrow(sc3, "01", "REMEMBER");
  function device(parent, img, w, h) {
    const e = el(`<div class="c device" style="width:${w}px"><div class="bar"><i></i><i></i><i></i><div class="url">${ic("ShieldCheck").replace('width="24" height="24"', 'width="13" height="13"')} one.app</div></div><div class="view" style="height:${h}px"><img src="${SCR + img}.png"/><img class="b" src="" style="opacity:0"/></div></div>`, parent);
    e.imgs = e.querySelectorAll("img");
    return e;
  }
  function phone(parent, img, w, h) {
    const e = el(`<div class="c phone" style="width:${w + 28}px"><div class="view" style="height:${h}px"><img src="${SCR + img}.png"/><img class="b" src="" style="opacity:0"/></div></div>`, parent);
    e.imgs = e.querySelectorAll("img");
    return e;
  }
  const dev3 = V ? phone(w3, "m-dashboard", 620, 1240) : device(w3, "dashboard", 1240, 775);
  dev3.imgs[1].src = SCR + (V ? "m-memory" : "memory") + ".png";
  const comp = el(`<div class="c composer"><div class="input"><span class="ph">Ask ONE anything or tell me what you need.</span><span class="tx"></span><span class="caret"></span></div>
    <div class="tabs"><span class="tab">${ic("MessageCircle")} Ask</span><span class="tab on">${ic("Brain")} Remember</span><span class="tab">${ic("SquareCheck")} Task</span><span class="tab">${ic("Paperclip")} Upload</span><span class="send">${ic("ArrowUp")}</span></div></div>`, w3);
  const compTx = comp.querySelector(".tx"), compPh = comp.querySelector(".ph"), caret = comp.querySelector(".caret"), sendBtn = comp.querySelector(".send");
  const toast3 = el(`<div class="c toast"><span class="chip tone-mint">${ic("Check")}</span> Saved to Memory.</div>`, w3);
  const h3 = headline(sc3, P("Everything important.\n*One place.*", "Everything\nimportant.\n*One place.*"), P(74, 96));
  h3.style.textAlign = V ? "center" : "left";
  const upCard = el(`<div class="c card mcard" style="width:420px"><div class="k">${ic("FileText")} Document</div><div class="tt">Car insurance renewal — Nordlicht</div>
     <div class="bd" style="display:flex;align-items:center;gap:8px">${ic("Upload").replace('width="24" height="24"', 'width="15" height="15"')} <span class="fn">nordlicht-car-insurance-renewal.txt</span></div>
     <div class="bar-track" style="margin-top:16px"><div class="bar-fill" style="width:0%"></div></div>
     <div class="bd st" style="margin-top:10px;font-size:15px">Uploading…</div></div>`, w3);
  const upFill = upCard.querySelector(".bar-fill"), upSt = upCard.querySelector(".st");
  const ideaCard = el(`<div class="c card mcard"><div class="k">${ic("Lightbulb")} Idea</div><div class="tt">Long weekend in Lisbon next spring</div><div class="bd">Alfama, LX Factory, sunset at Miradouro.</div><span class="tag">#travel</span></div>`, w3);
  const passCard = el(`<div class="c card mcard"><div class="k">${ic("StickyNote")} Note</div><div class="tt">Passport expires on 14 March 2027</div><div class="bd">Book a renewal appointment in time.</div><span class="tag">#documents</span><span class="tag">#travel</span></div>`, w3);
  const searchCard = el(`<div class="c card search"><div class="q">${ic("Search")}<span class="sq"></span><span class="caret"></span></div>
     <div class="r"><span class="chip tone-blue">${ic("FileText")}</span><div><div style="font-size:19px;font-weight:600">Car <mark>insurance</mark> renewal — Nordlicht</div><div class="muted" style="font-size:15px;margin-top:3px">Document · …your car <mark>insurance</mark> renews automatically…</div></div></div></div>`, w3);
  const sq = searchCard.querySelector(".sq"), sCaret = searchCard.querySelector(".caret"), sRes = searchCard.querySelector(".r");

  const L3 = V
    ? { dev: { x: 0, y: 260 }, comp: { x: 0, y: -330 }, h: { x: 0, y: -600 }, up: { x: -150, y: -250 }, idea: { x: 230, y: -20 }, pass: { x: -220, y: 290 }, search: { x: 60, y: 600 } }
    : { dev: { x: 260, y: 40 }, comp: { x: -40, y: -40 }, h: { x: -560, y: -10 }, up: { x: 300, y: -250 }, idea: { x: 740, y: -290 }, pass: { x: 750, y: 250 }, search: { x: 330, y: 245 } };

  function floatIn(e, t, a, from, to, extra = {}) {
    const p = spring(t - a, 6, 7.5);
    const fl = Math.sin(t * 0.8 + to.x * 0.01) * 10;
    pos(e, { x: lerp(from.x, to.x, p), y: lerp(from.y, to.y, p) + fl, z: lerp(-400, to.z ?? 80, p), ry: (1 - p) * -20 + (extra.ry ?? 0), rx: extra.rx ?? 0, s: lerp(0.5, 1, clamp(p)), o: clamp(p * 1.6) * (extra.o ?? 1), blur: extra.blur ?? 0 });
  }

  function updateSc3(t) {
    { // iris reveal from the logo ring
      const ip = E.ioExpo(prog(t, K.iris, K.iris + 0.85));
      const diam = 60 + ip * Math.hypot(W, H) * 1.15;
      sc3.style.clipPath = t < K.iris + 0.9 ? `circle(${(diam / 2).toFixed(1)}px at 50% ${(H / 2 + lerp(markY, 0, ip)).toFixed(1)}px)` : "none";
    }
    eyebrowAnim(eb3, t, 14.35, 22.6, P(-W / 2 + 230, 0), P(-H / 2 + 90, -H / 2 + 120));
    // device
    const rise = ease(t, 13.3, 15.0, E.outQuint);
    const back = ease(t, 17.85, 18.9, E.io);
    const push = ease(t, K.pushIn, K.pushIn + 0.8, E.inCubic);
    const d = L3.dev;
    pos(dev3, {
      x: d.x + back * P(330, 0), y: d.y + (1 - rise) * 500 + Math.sin(t * 0.6) * 6,
      z: -80 - back * P(300, 250) - push * 600, rx: P(9 - rise * 3, 6), ry: P(-17 + rise * 5 - back * 8, 0) + Math.sin(t * 0.4) * 1.5,
      s: P(1.0, 0.85), o: rise * (1 - push * 0.9), blur: push * 8 + back * P(0.6, 2),
    });
    dev3.imgs[1].style.opacity = ease(t, 17.95, 18.5).toFixed(3);
    // composer — the "Remember" flow, exactly as in ONE
    const cp = spring(t - 15.2, 6.5, 8);
    const absorb = ease(t, 17.85, 18.55, E.inCubic);
    const txt = typed(TL.REMEMBER_TEXT, t, K.typeRemember);
    compTx.textContent = t < K.sendRemember + 0.1 ? txt : "";
    compPh.style.display = txt.length && t < K.sendRemember + 0.1 ? "none" : "inline";
    caret.style.opacity = Math.sin(t * 12) > -0.2 || (t > K.typeRemember[0] && t < K.typeRemember[1]) ? 1 : 0;
    const filled = txt.length > 0 && t < K.sendRemember + 0.1;
    sendBtn.style.background = filled ? "var(--accent)" : "#cfe3f5";
    sendBtn.style.transform = `scale(${1 - 0.12 * clamp(1 - Math.abs(t - K.sendRemember - 0.04) / 0.12)})`;
    pos(comp, { x: L3.comp.x, y: L3.comp.y + (1 - cp) * 80 + Math.sin(t) * 4, z: 140 - absorb * 900, ry: P(-6, 0), rx: 4, s: (0.94 + 0.06 * cp) * (1 - absorb * 0.5), o: clamp(cp * 1.5) * (1 - absorb), blur: absorb * 6 });
    const tp = spring(t - (K.sendRemember + 0.2), 8, 10);
    pos(toast3, { x: L3.comp.x, y: L3.comp.y + P(150, 160) + (1 - tp) * 20, z: 160 - absorb * 900, s: 0.8 + 0.2 * clamp(tp), o: clamp(tp * 2) * (1 - absorb) * (t > K.sendRemember + 0.2 ? 1 : 0) });
    // headline
    pos(h3, { x: V ? 0 : -W / 2 + 130 + h3.offsetWidth / 2, y: L3.h.y }); words(h3, t, 18.05, K.pushIn + 0.2, { st: 0.1 });
    // floating memory cards
    const from = { x: L3.dev.x + P(330, 0), y: L3.dev.y };
    const fade = 1 - push;
    const pushBlur = push * 10;
    // the uploaded document becomes the hero of the next scene
    const upTo = { ...L3.up, z: 90 };
    const pIn = ease(t, K.pushIn - 0.1, K.pushIn + 0.75, E.io);
    floatIn(upCard, t, K.uploadStart - 0.2, from, upTo, { ry: P(-6, 0) });
    if (pIn > 0) pos(upCard, { x: lerp(upTo.x, 0, pIn), y: lerp(upTo.y, 0, pIn), z: lerp(90, 420, pIn), s: 1 + pIn * 0.3, o: 1 - ease(t, K.pushIn + 0.45, K.pushIn + 0.8), blur: pIn * 3 });
    const up = ease(t, K.uploadStart, K.uploadDone, E.io);
    upFill.style.width = (up * 100).toFixed(1) + "%";
    upSt.innerHTML = t < K.uploadDone ? `Uploading… ${Math.round(up * 100)}%` : `<span style="color:var(--mint-ink);font-weight:500">✓ Extracted text (317 characters)</span>`;
    floatIn(ideaCard, t, 19.0, from, L3.idea, { ry: P(-10, 0), o: fade, blur: pushBlur });
    floatIn(passCard, t, 19.4, from, L3.pass, { ry: P(-12, 0), o: fade, blur: pushBlur });
    floatIn(searchCard, t, 19.85, from, { ...L3.search, z: 160 }, { ry: P(-5, 0), o: fade, blur: pushBlur });
    sq.textContent = typed(TL.SEARCH_TEXT, t, K.typeSearch);
    sCaret.style.opacity = t < 21.1 ? (Math.sin(t * 12) > -0.2 ? 1 : 0) : 0;
    const rs = ease(t, 21.1, 21.5);
    sRes.style.opacity = rs; sRes.style.transform = `translateY(${(1 - rs) * 10}px)`; sRes.style.maxHeight = (rs * 120) + "px";
  }

  // ═════════════════════════ SCENE 4 — UNDERSTAND ═════════════════════════
  const sc4 = layer();
  const w4 = world(sc4);
  const lines4 = el(`<svg class="layer" width="${W}" height="${H}" style="overflow:visible"></svg>`, sc4);
  const eb4 = eyebrow(sc4, "02", "UNDERSTAND");
  const letter = el(`<div class="c card letter" style="position:absolute;overflow:hidden">
    <div class="hd"><div class="co"><span class="lg"></span>Nordlicht Versicherung AG</div><div class="muted" style="font-size:15px">Policy no. KFZ-44817-2</div></div>
    <div class="ln" style="margin-top:26px">Dear Ms Lindqvist,</div>
    <div class="ln">your car insurance <span class="mk blue"><b></b>renews automatically on 01.01.2027</span>.</div>
    <div class="ln">The annual premium increases from <span class="mk blue"><b></b>548.00 EUR to 612.40 EUR</span>.</div>
    <div class="ln">If you wish to cancel, your notice <span class="mk peach"><b></b>must reach us by 30.11.2026</span>.</div>
    <div class="ln">Please send the cancellation in writing or via the customer portal.</div>
    <div class="ph" style="width:92%;margin-top:28px"></div><div class="ph" style="width:70%"></div>
    <div style="display:flex;align-items:center;gap:10px;margin-top:26px;padding-top:18px;border-top:1px solid var(--line);font-size:15px" class="muted">${ic("FileText").replace('width="24" height="24"', 'width="16" height="16"')} nordlicht-car-insurance-renewal.txt · Extracted text</div>
    <div class="scanbar"></div></div>`, w4);
  const marks = [...letter.querySelectorAll(".mk b")], scanbar = letter.querySelector(".scanbar");
  const FACTS = [["CalendarDays", "blue", "Renews · 1 Jan 2027"], ["Receipt", "lav", "New premium · 612.40 EUR / year"], ["Flag", "peach", "Deadline · 30 Nov 2026"]];
  const facts = FACTS.map(([i, tone, txt]) => el(`<div class="c fact"><span class="chip tone-${tone}">${ic(i)}</span>${txt}</div>`, w4));
  const sumCard = el(`<div class="c card secard"><div class="h">${ic("Sparkles")} Summary</div><div class="d">Key points from this document</div>
     <div class="b">Your car insurance renews automatically on <b>01.01.2027</b>. The annual premium increases from 548.00 EUR to <b>612.40 EUR</b>.</div></div>`, w4);
  const taskCard = el(`<div class="c card secard"><div class="h">${ic("ListChecks")} Tasks &amp; deadlines</div><div class="d">Turn what's in here into things to do.</div>
     <div class="trow" style="margin-top:10px"><span class="circ"></span><div><div class="tt">Cancel Nordlicht car insurance</div><div class="meta">${ic("CalendarDays")} 30 Nov <span class="badge tone-peach">Deadline</span><span class="badge tone-rose">${ic("Flag")} High</span></div></div></div></div>`, w4);
  const relHead = el(`<div class="c" style="white-space:nowrap"><div style="display:flex;gap:10px;align-items:center;font-size:20px;font-weight:600">${ic("Link").replace('width="24" height="24"', 'width="20" height="20" style="color:#6aafe8"')} Related</div><div class="muted" style="font-size:15px;margin-top:4px">Connected by shared tags and keywords</div></div>`, w4);
  const REL = [["Zap", "lav", "Cancel Nordlicht car insurance", "Action · Cancel a contract"], ["FileText", "blue", "Rental agreement — Kastanienallee 12", "Memory · Document"], ["Receipt", "blue", "Electricity invoice — Stadtwerke", "Memory · Document"], ["StickyNote", "mint", "Passport expires on 14 March 2027", "Memory · Note"]];
  const rels = REL.map(([i, tone, t1, s1]) => el(`<div class="c card rnode"><span class="chip tone-${tone}">${ic(i)}</span><div style="min-width:0"><div class="tt">${t1}</div><div class="s">${s1}</div></div></div>`, w4));
  const relPaths = REL.map(() => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.innerHTML = `<path fill="none" stroke="url(#lg4)" stroke-width="2.5" stroke-linecap="round"/><circle r="5" fill="#438ed4"/><circle r="12" fill="rgba(106,175,232,.25)"/><circle r="6" fill="#fff" stroke="#6aafe8" stroke-width="2.5"/>`;
    lines4.appendChild(g); return g;
  });
  lines4.insertAdjacentHTML("afterbegin", `<defs><linearGradient id="lg4" x1="0" x2="1"><stop offset="0" stop-color="#bbdfff"/><stop offset="1" stop-color="#438ed4"/></linearGradient></defs>`);
  const h4 = headline(sc4, P("Not just stored. *Understood.*", "Not just stored.\n*Understood.*"), P(72, 84));

  const L4 = V
    ? { letter: { x: 0, y: -440, s: 0.92 }, facts: [[0, 10], [0, 85], [0, 160]], sum: null, task: { x: 0, y: 330 }, relHead: { x: 0, y: 500 }, rel: [[-232, 595], [232, 595], [-232, 690], [232, 690]], h: { x: 0, y: 860 } }
    : { letter: { x: -95, y: -15, s: 0.98 }, facts: [[620, -385], [620, -315], [620, -245]], sum: { x: 620, y: -45 }, task: { x: 620, y: 215 }, relHead: { x: -735, y: -330 }, rel: [[-700, -215], [-700, -95], [-700, 25], [-700, 145]], h: { x: 0, y: 440 } };
  let letterH = 700;
  function updateSc4(t) {
    eyebrowAnim(eb4, t, 23.1, 31.4, P(-W / 2 + 240, 0), P(-H / 2 + 90, -H / 2 + 120));
    const a = spring(t - 22.75, 6, 7);
    const exit = ease(t, K.toAct, K.toAct + 0.7, E.inCubic);
    const Ll = L4.letter;
    letterH = letter.offsetHeight;
    const ls = Ll.s * lerp(1.25, 1, clamp(a));
    pos(letter, { x: Ll.x, y: Ll.y + Math.sin(t * 0.7) * 4, z: lerp(250, 0, clamp(a)) - exit * 500, ry: P((1 - clamp(a)) * 10, 0), s: ls, o: clamp(a * 2) * (1 - exit), blur: exit * 8 });
    // scan beam
    const sp = prog(t, K.scan[0], K.scan[1]);
    scanbar.style.top = (lerp(-140, letterH, E.io(sp))) + "px";
    scanbar.style.opacity = sp > 0 && sp < 1 ? Math.min(1, Math.min(sp, 1 - sp) * 8) : 0;
    // highlights + extracted facts
    marks.forEach((m, i) => { m.style.transform = `scaleX(${ease(t, K.hl[i], K.hl[i] + 0.45, E.outCubic).toFixed(3)})`; });
    facts.forEach((f, i) => {
      const mk = marks[i].parentElement;
      const sx = Ll.x + ls * (mk.offsetLeft + mk.offsetWidth / 2 - letter.offsetWidth / 2);
      const sy = Ll.y + ls * (mk.offsetTop + mk.offsetHeight / 2 - letterH / 2);
      const p = ease(t, K.hl[i] + 0.25, K.hl[i] + 1.05, E.io);
      const [tx, ty] = L4.facts[i];
      const ap = ease(t, K.hl[i] + 0.2, K.hl[i] + 0.45);
      pos(f, { x: lerp(sx, tx, p), y: lerp(sy, ty, p) - Math.sin(p * Math.PI) * 60 + (p >= 1 ? Math.sin(t + i) * 3 : 0), z: 60 + Math.sin(p * Math.PI) * 120 - exit * 500, s: lerp(0.6, 1, ap), o: ap * (1 - exit) });
    });
    if (L4.sum) { const p = spring(t - K.summaryIn, 6.5, 8); pos(sumCard, { x: L4.sum.x, y: L4.sum.y + (1 - p) * 40, z: 20 - exit * 500, s: 0.9 + 0.1 * clamp(p), o: clamp(p * 1.5) * (1 - exit) }); } else pos(sumCard, { o: 0 });
    // the task card survives into ACT
    const tp = spring(t - (K.summaryIn + 0.5), 6.5, 8);
    const toC = ease(t, K.toAct - 0.1, K.toAct + 0.75, E.io);
    pos(taskCard, { x: lerp(L4.task.x, 0, toC), y: lerp(L4.task.y + (1 - tp) * 40, P(-40, -60), toC), z: lerp(20, 120, toC), s: (0.9 + 0.1 * clamp(tp)) * lerp(1, 1.25, toC), o: clamp(tp * 1.5) * (1 - ease(t, K.toAct + 0.45, K.toAct + 0.8)) });
    // related — connections
    const rh = ease(t, K.related[0] - 0.3, K.related[0] + 0.3);
    pos(relHead, { x: L4.relHead.x + (V ? 0 : 0), y: L4.relHead.y, o: rh * (1 - exit), blur: (1 - rh) * 6 });
    if (!V) relHead.style.transformOrigin = "0 50%";
    const lx = V ? Ll.x : Ll.x - ls * (letter.offsetWidth / 2);
    rels.forEach((r, i) => {
      const p = spring(t - K.related[i] - 0.25, 7, 9);
      const [rx, ry] = L4.rel[i];
      pos(r, { x: rx + (1 - clamp(p)) * P(-40, 0), y: ry + Math.sin(t * 0.9 + i) * 3, s: 0.85 + 0.15 * clamp(p), o: clamp(p * 1.6) * (1 - exit) });
      // bezier from the letter to the node
      const g = relPaths[i], path = g.children[0];
      const side = rx > 0 ? 1 : -1;
      const ax = V ? W / 2 + side * (ls * letter.offsetWidth / 2 - 30 - (i > 1 ? 50 : 0)) : W / 2 + lx;
      const ay = V ? H / 2 + Ll.y + ls * letterH / 2 : H / 2 + Ll.y + (i - 1.5) * 70;
      const bx = V ? W / 2 + rx + side * 50 : W / 2 + rx + 200, by = V ? H / 2 + ry : H / 2 + ry;
      const d = V ? `M${ax},${ay} C${ax + side * 150},${ay + 380} ${W / 2 + side * 500},${by - 160} ${bx + side * 150},${by}` : `M${ax},${ay} C${ax - 70},${ay} ${bx + 80},${by} ${bx},${by}`;
      path.setAttribute("d", d);
      const len = path.getTotalLength();
      const dp = ease(t, K.related[i] - 0.15, K.related[i] + 0.45, E.io);
      path.setAttribute("stroke-dasharray", `${len}`); path.setAttribute("stroke-dashoffset", `${len * (1 - dp)}`);
      const pulse = ((t - K.related[i] - 0.45) * 0.55) % 1;
      const pt = path.getPointAtLength(len * (dp < 1 ? dp : 1 - (pulse < 0 ? 0 : pulse)));
      g.children[1].setAttribute("cx", pt.x); g.children[1].setAttribute("cy", pt.y);
      g.children[1].setAttribute("opacity", dp > 0 ? 1 : 0);
      g.children[2].setAttribute("cx", ax); g.children[2].setAttribute("cy", ay); g.children[3].setAttribute("cx", ax); g.children[3].setAttribute("cy", ay);
      g.children[2].setAttribute("opacity", dp > 0 ? 1 : 0); g.children[3].setAttribute("opacity", dp > 0 ? 1 : 0);
      g.style.opacity = (1 - exit).toFixed(3);
    });
    pos(h4, { x: L4.h.x, y: L4.h.y }); words(h4, t, 27.95, K.toAct + 0.3, { st: 0.1 });
  }

  // ═════════════════════════ SCENE 5 — ACT ═════════════════════════
  const sc5 = layer();
  const w5 = world(sc5);
  const eb5 = eyebrow(sc5, "03", "ACT");
  const h5 = headline(sc5, P("From information to *action.*", "From information\nto *action.*"), P(80, 90));
  const STEPS = ["Find the contract or customer number", "Check the notice period and the earliest possible end date", "Review and personalise the cancellation letter", "Send it in a verifiable way", "Save the cancellation confirmation in Memory"];
  const DRAFT = "Subject: Cancellation of my contract\n\nDear Sir or Madam,\n\nI hereby cancel my contract (customer/contract no. 44817) at the earliest possible date.\n\nPlease send me a written confirmation…";
  const AW = P(1000, 900);
  const acard = el(`<div class="c card acard" style="width:${AW}px;overflow:hidden">
    <div class="ph pA" style="position:absolute;inset:30px 34px">
      <div style="display:flex;align-items:center;gap:10px;font-size:22px;font-weight:600">${ic("ListChecks").replace('width="24"', 'width="22" style="color:#6aafe8"')} Tasks &amp; deadlines</div>
      <div class="muted" style="font-size:17px;margin-top:16px">ONE found 1 item. Choose what to add:</div>
      <div class="trow" style="margin-top:8px;border:1px solid var(--line);border-radius:16px;padding:14px 16px"><span class="circ cb" style="border-radius:7px"></span><div><div class="tt">Cancel Nordlicht car insurance</div><div class="meta">${ic("CalendarDays")} 30 Nov <span class="badge tone-peach">Deadline</span></div></div></div>
      <div style="display:flex;align-items:center;gap:16px;margin-top:20px"><span class="btn primary bA">Add 1 to Life</span><span class="tA" style="font-size:17px;color:var(--mint-ink);font-weight:500;opacity:0">✓ 1 item added to Life</span></div>
    </div>
    <div class="ph pB" style="position:absolute;inset:30px 34px">
      <div style="display:flex;align-items:center;gap:10px;font-size:22px;font-weight:600">${ic("CalendarDays").replace('width="24"', 'width="22" style="color:#6aafe8"')} Life <span class="muted" style="font-weight:400;font-size:17px">· Coming up</span></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:18px;border:1px solid var(--line);border-radius:16px;padding:16px 18px">
        <div class="trow" style="padding:0"><span class="circ"></span><div><div class="tt">Cancel Nordlicht car insurance</div><div class="meta">${ic("CalendarDays")} 30 Nov <span class="badge tone-peach">Deadline</span><span class="badge tone-rose">${ic("Flag")} High</span></div></div></div>
        <span class="btn primary bB">${ic("Zap")} Create an action from this</span></div>
      <div class="muted" style="font-size:16px;margin-top:16px;display:flex;gap:8px;align-items:center">${ic("Bell").replace('width="24" height="24"', 'width="16" height="16"')} Notice must reach Nordlicht by 30.11.2026</div>
    </div>
    <div class="ph pC" style="position:absolute;inset:30px 34px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><div style="font-size:16px;color:var(--accent-strong);display:flex;gap:8px;align-items:center">✂️ Cancel a contract</div><div style="font-size:${P(32, 28)}px;font-weight:600;letter-spacing:-.02em;margin-top:6px">Cancel Nordlicht car insurance</div></div>
        <div class="seg"><span>New</span><span>In progress</span>${V ? "" : "<span>Waiting for you</span>"}<span>Done</span></div>
      </div>
      <div style="display:flex;gap:26px;margin-top:22px">
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:19px;font-weight:600">Next steps</span><span class="muted cnt" style="font-size:15px">0 of 5</span></div>
          <div class="bar-track" style="margin:12px 0 8px"><div class="bar-fill sf" style="width:0%"></div></div>
          ${STEPS.map((s, i) => `<div class="step"><span class="num">${i + 1}<span class="ok" style="opacity:0">${ic("Check")}</span></span><span class="tx">${s}<s style="width:0"></s></span></div>`).join("")}
        </div>
        ${V ? "" : `<div style="width:330px"><div style="font-size:19px;font-weight:600">Draft</div><div class="draft" style="margin-top:12px;height:252px;overflow:hidden"><span class="dt"></span></div></div>`}
      </div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:16px"><span class="btn primary bC">I've sent / completed this</span><span class="muted" style="font-size:15px;display:flex;gap:8px;align-items:center">${ic("ShieldCheck").replace('width="24" height="24"', 'width="16" height="16"')} ONE never sends anything on its own.</span></div>
    </div>
    <div class="ph pD" style="position:absolute;inset:30px 34px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
      <svg viewBox="0 0 100 100" width="130" height="130"><circle cx="50" cy="50" r="44" fill="#e8f8f1"/><circle class="dc" cx="50" cy="50" r="44" fill="none" stroke="#1f7a55" stroke-width="5" stroke-linecap="round" transform="rotate(-90 50 50)" stroke-dasharray="276.5"/><path class="dk" d="M31 51 L44 64 L70 37" fill="none" stroke="#1f7a55" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="60"/></svg>
      <div style="font-size:30px;font-weight:600;margin-top:18px;letter-spacing:-.02em">You confirmed completion</div>
      <div class="muted" style="font-size:19px;margin-top:8px">Cancel Nordlicht car insurance · <span style="color:var(--mint-ink);font-weight:500">Done</span></div>
    </div></div>`, w5);
  const ph = { A: acard.querySelector(".pA"), B: acard.querySelector(".pB"), C: acard.querySelector(".pC"), D: acard.querySelector(".pD") };
  const cb = acard.querySelector(".cb"), bA = acard.querySelector(".bA"), tA = acard.querySelector(".tA"), bB = acard.querySelector(".bB"), bC = acard.querySelector(".bC");
  const segs = [...acard.querySelectorAll(".seg span")], cnt = acard.querySelector(".cnt"), sf = acard.querySelector(".sf"), dt = acard.querySelector(".dt");
  const stepEls = [...acard.querySelectorAll(".step")];
  const dc = acard.querySelector(".dc"), dk = acard.querySelector(".dk");
  const PIPE = [["FileText", "DOCUMENT"], ["Sparkles", "UNDERSTAND"], ["SquareCheck", "TASK"], ["Zap", "ACTION"], ["CircleCheck", "COMPLETED"]];
  const pipe = el(`<div class="c pipe">${PIPE.map(([i, l], k) => `${k ? '<div class="pline"><i></i></div>' : ""}<div class="pnode"><div class="ring">${ic(i)}</div><div class="lb">${l}</div></div>`).join("")}</div>`, sc5);
  const pnodes = [...pipe.querySelectorAll(".pnode")], plines = [...pipe.querySelectorAll(".pline i")];
  const PT = [31.7, 32.3, 33.75, 35.4, K.done];
  const PH = { A: P(300, 330), B: P(250, 300), C: P(560, 610), D: P(380, 400) };
  const press = (b, t, tc) => { b.style.transform = `scale(${(1 - 0.07 * clamp(1 - Math.abs(t - tc - 0.03) / 0.12)).toFixed(3)})`; };
  function updateSc5(t) {
    eyebrowAnim(eb5, t, 32.0, 42.7, P(-W / 2 + 200, 0), P(-H / 2 + 90, -H / 2 + 120));
    pos(h5, { y: P(-410, -700) }); words(h5, t, 32.35, 42.75, { st: 0.1 });
    const intro = spring(t - (K.toAct + 0.55), 6.5, 8);
    const exit = ease(t, 42.55, 43.25, E.inCubic);
    // phase cross-fades + card height morph
    const fA = 1 - ease(t, 33.85, 34.2), fB = Math.min(ease(t, 34.0, 34.4), 1 - ease(t, 35.75, 36.1)), fC = Math.min(ease(t, 35.95, 36.35), 1 - ease(t, K.done - 0.05, K.done + 0.3)), fD = ease(t, K.done + 0.15, K.done + 0.5);
    const h = t < 34.0 ? PH.A : t < 35.9 ? lerp(PH.A, PH.B, ease(t, 33.9, 34.4, E.io)) : t < K.done ? lerp(PH.B, PH.C, ease(t, 35.85, 36.4, E.io)) : lerp(PH.C, PH.D, ease(t, K.done, K.done + 0.5, E.io));
    acard.style.height = h + "px";
    const slide = (e, f, dir) => { e.style.opacity = f.toFixed(3); e.style.transform = `translateY(${((1 - f) * 18 * dir).toFixed(1)}px)`; e.style.visibility = f < 0.01 ? "hidden" : "visible"; };
    slide(ph.A, fA, -1); slide(ph.B, fB, 1); slide(ph.C, fC, 1); slide(ph.D, fD, 1);
    const pop = K.done < t ? spring(t - K.done, 9, 16) : 0;
    pos(acard, { y: P(-40, -60) + (1 - clamp(intro)) * 60 + Math.sin(t * 0.8) * 3, z: lerp(-200, 0, clamp(intro)) - exit * 600, rx: (1 - clamp(intro)) * 10, s: P(1.04, 1.08) * lerp(0.94, 1, clamp(intro)) * (1 + 0.03 * Math.sin(pop * Math.PI) * (t < K.done + 0.6 ? 1 : 0)), o: clamp(intro * 2) * (1 - exit), blur: exit * 10 });
    // phase A
    const ck = t > K.tick1;
    cb.style.background = ck ? "var(--accent)" : "#fff"; cb.style.borderColor = ck ? "var(--accent)" : "var(--cloud)";
    cb.innerHTML = ck ? ic("Check") : "";
    press(bA, t, K.addToLife);
    tA.style.opacity = ease(t, K.addToLife + 0.15, K.addToLife + 0.4);
    press(bB, t, K.createAction);
    // phase C — status, steps, draft
    const status = t >= K.done ? (V ? 2 : 3) : t >= K.steps[0] ? 1 : 0;
    segs.forEach((s, i) => s.classList.toggle("on", i === status));
    let n = 0;
    stepEls.forEach((s, i) => {
      const tt = i < 4 ? K.steps[i] : K.done;
      const p = ease(t, tt, tt + 0.3, E.outBack);
      if (t >= tt) n++;
      s.querySelector(".ok").style.opacity = clamp(p * 2); s.querySelector(".ok").style.transform = `scale(${0.4 + 0.6 * p})`;
      s.querySelector("s").style.width = (ease(t, tt + 0.1, tt + 0.45) * 100) + "%";
      s.querySelector(".tx").style.color = t >= tt ? "var(--muted)" : "var(--ink)";
    });
    cnt.textContent = `${n} of 5`;
    sf.style.width = (n / 5 * 100) + "%";
    if (dt) dt.textContent = typed(DRAFT, t, [36.3, 39.2]);
    press(bC, t, K.sent);
    // phase D — done
    dc.setAttribute("stroke-dashoffset", (276.5 * (1 - ease(t, K.done + 0.2, K.done + 0.8, E.outCubic))).toFixed(2));
    dk.setAttribute("stroke-dashoffset", (60 * (1 - ease(t, K.done + 0.55, K.done + 0.9, E.outCubic))).toFixed(2));
    // pipeline
    const pp = spring(t - (K.toAct + 0.4), 6, 8);
    pos(pipe, { y: P(400, 640), s: P(1, 0.82) * (0.9 + 0.1 * clamp(pp)), o: clamp(pp * 1.5) * (1 - exit) });
    pnodes.forEach((nd, i) => {
      const on = ease(t, PT[i], PT[i] + 0.35);
      const ring = nd.querySelector(".ring");
      const last = i === 4;
      ring.style.background = on > 0.5 ? (last ? "var(--mint)" : "var(--mist)") : "#fff";
      ring.style.color = on > 0.5 ? (last ? "var(--mint-ink)" : "var(--accent)") : "var(--muted)";
      ring.style.borderColor = on > 0.5 ? (last ? "#9fdcbf" : "var(--cloud)") : "var(--line)";
      const active = on > 0.5 && (i === 4 || t < PT[i + 1]);
      ring.style.boxShadow = active ? `0 0 0 ${6 + 3 * Math.sin(t * 6)}px ${last ? "rgba(31,122,85,.12)" : "rgba(106,175,232,.2)"}, 0 10px 30px -6px rgba(67,142,212,.45)` : "var(--shadow-soft)";
      ring.style.transform = `scale(${1 + 0.12 * Math.sin(Math.PI * clamp((t - PT[i]) / 0.35))})`;
      nd.querySelector(".lb").style.color = on > 0.5 ? (last ? "var(--mint-ink)" : "var(--accent-strong)") : "var(--muted)";
      if (i < 4) plines[i].style.width = (ease(t, PT[i] + 0.1, PT[i + 1], E.io) * 100) + "%";
    });
  }

  // ═════════════════════════ SCENE 6 — THE ONE EXPERIENCE ═════════════════════════
  const sc6 = layer();
  const w6 = world(sc6);
  const MONT = V
    ? [["m-dashboard", "House", "HOME", "Your day at a glance"], ["m-memory", "Brain", "MEMORY", "Searchable, connected, yours"], ["m-action", "Zap", "ACTION", "Steps & drafts, prepared"], ["m-life", "CalendarDays", "LIFE", "Tasks, deadlines, goals"], ["m-intelligence", "Sparkles", "INTELLIGENCE", "Answers with sources"]]
    : [["dashboard", "House", "HOME", "Your day at a glance"], ["memory", "Brain", "MEMORY", "Everything you want to remember — searchable, connected"], ["action-detail", "Zap", "ACTION", "Steps, drafts and missing info — prepared for you"], ["life-week", "CalendarDays", "LIFE", "Tasks, appointments, deadlines and goals — calmly organised"], ["intelligence", "Sparkles", "INTELLIGENCE", "Insights and answers — always with sources"]];
  // focus point (fraction of the screenshot) for each slow push-in
  const FOCUS = V ? [[0.5, 0.35], [0.5, 0.45], [0.5, 0.4], [0.5, 0.4], [0.5, 0.4]] : [[0.62, 0.55], [0.6, 0.55], [0.45, 0.4], [0.6, 0.45], [0.55, 0.3]];
  const DW = P(1360, 640), DH = P(850, 1300);
  const devs = MONT.map(([img]) => (V ? phone(w6, img, DW, DH) : device(w6, img, DW, DH)));
  const labels = MONT.map(([, icon, n, d]) => el(`<div class="c mlabel card"><span class="chip tone-blue">${ic(icon)}</span><div><div class="n">${n}</div><div class="d">${d}</div></div></div>`, sc6));
  const h6 = headline(sc6, P("One system. More *clarity.* Less chaos.", "One system.\nMore *clarity.*\nLess chaos."), P(84, 96));
  const STEP = 34; // degrees between screens on the carousel
  const RAD = P(2100, 1250);
  function updateSc6(t) {
    // carousel angle with eased stops at each cut
    let phi = -STEP * 1.3;
    K.cuts.forEach((c, i) => { if (i === 0) phi = lerp(-STEP * 1.6, 0, ease(t, 42.75, 43.5, E.outQuint)); else phi = lerp(phi, i * STEP, ease(t, c - 0.42, c + 0.33, E.ioExpo)); });
    const fan = ease(t, K.fan - 0.05, K.fan + 0.95, E.io);
    const out = ease(t, 52.8, 53.55, E.inCubic);
    const intro = ease(t, 42.75, 43.45, E.outQuint);
    devs.forEach((d, i) => {
      const a = (i * STEP - phi) * Math.PI / 180;
      let x = Math.sin(a) * RAD, z = Math.cos(a) * RAD - RAD, ry = -(i * STEP - phi) * 0.9;
      const focus = clamp(1 - Math.abs(i * STEP - phi) / STEP);
      let y = 40 * P(1, 0.5), s = P(0.86, 0.95), o = clamp(1.35 - Math.abs(i * STEP - phi) / STEP * 0.75) * intro, blur = (1 - focus) * 3 + (1 - intro) * 10;
      // fan arrangement for the payoff line
      const k = i - 2;
      const fx = k * P(385, 215), fy = P(150, 260) + Math.abs(k) * P(34, 50), fz = -Math.abs(k) * 60, frz = k * P(4, 5), fs = P(0.35, 0.36);
      x = lerp(x, fx, fan); y = lerp(y, fy, fan); z = lerp(z - (1 - intro) * 1400, fz, fan); ry = lerp(ry, 0, fan); s = lerp(s, fs, fan); o = lerp(o, 1, fan); blur = lerp(blur, 0, fan);
      const rz = lerp(0, frz, fan);
      // finale: everything flies back into the light
      z -= out * 2200; o *= 1 - out; blur += out * 8; y = lerp(y, P(-110, -260), out * 0.6);
      pos(d, { x, y: y + Math.sin(t * 0.7 + i) * 5, z, ry, rz, s, o, blur });
      // slow focus push inside the screen
      const seg = clamp((t - K.cuts[i] + 0.4) / 2.2);
      const zoom = 1 + 0.16 * E.io(seg) * (1 - fan);
      const [fxp, fyp] = FOCUS[i];
      const img = d.imgs[0];
      const ih = img.naturalHeight / img.naturalWidth * DW;
      const maxShift = Math.max(0, ih - DH);
      const baseY = V ? -Math.min(maxShift, 0) : 0;
      img.style.transform = `translate(${(-(zoom - 1) * DW * fxp).toFixed(1)}px,${(baseY - (zoom - 1) * DH * fyp).toFixed(1)}px) scale(${zoom.toFixed(4)})`;
    });
    labels.forEach((l, i) => {
      const a = K.cuts[i] + (i === 0 ? 0.15 : -0.05), b = i < 4 ? K.cuts[i + 1] - 0.15 : K.fan - 0.05;
      const p = ease(t, a, a + 0.5, E.outQuint), q = ease(t, b - 0.3, b, E.inCubic);
      pos(l, { x: 0, y: -H / 2 + 175 + (1 - p) * 20, s: 1.2, o: p * (1 - q), blur: (1 - p) * 8 + q * 8 });
      if (!V) { l.dataset.tl = "1"; l.style.left = "0"; l.style.top = "0"; pos(l, { x: 90 - (1 - p) * 30, y: 64, s: 1.25, o: p * (1 - q), blur: (1 - p) * 8 + q * 8 }); l.style.transformOrigin = '0 0'; }
    });
    pos(h6, { y: P(-300, -560) }); words(h6, t, K.fan + 0.2, 53.05, { st: 0.11, out: 0.45 });
  }

  // ═════════════════════════ SCENE 7 — FINALE ═════════════════════════
  const sc7 = layer();
  const bloom = el(`<div class="layer" style="background:radial-gradient(circle at 50% 45%, #fff 0%, rgba(255,255,255,.95) 35%, rgba(255,255,255,0) 80%)"></div>`, sc7);
  const lock = el(`<div class="c" style="white-space:nowrap;display:flex;align-items:center;gap:${P(34, 30)}px"></div>`, sc7);
  const mark7 = makeMark(lock, P(150, 170), "b"); mark7.classList.remove("c"); mark7.style.position = "relative";
  const wm = el(`<div style="font-size:${P(132, 140)}px;font-weight:600;color:var(--ink);letter-spacing:.18em;line-height:1;margin-right:-.18em;white-space:nowrap">${"ONE".split("").map((c) => `<span style="display:inline-block">${c}</span>`).join("")}</div>`, lock);
  const wmL = [...wm.children];
  const sub7 = headline(sc7, P("Your Personal Life Operating System.", "Your Personal Life\nOperating System."), P(42, 50));
  sub7.style.fontWeight = 450; sub7.style.letterSpacing = "-0.01em"; sub7.style.color = "#5d6d82"; sub7.style.lineHeight = "1.25";
  const CLAIM = ["Remember everything.", "Understand your life.", "Get things done."];
  const claim = el(`<div class="c" style="display:flex;${V ? "flex-direction:column;align-items:center;gap:10px" : "gap:26px"};white-space:nowrap">${CLAIM.map((c, i) => `<span style="font-size:${P(31, 40)}px;font-weight:550;letter-spacing:-.015em;display:inline-block;color:${["#2f74b5", "#438ed4", "#23364d"][i]}">${c}</span>`).join("")}</div>`, sc7);
  const claimEls = [...claim.children];
  const cta = el(`<div class="c cta">Discover ONE ${ic("ArrowRight")}<span class="sh"></span></div>`, sc7);
  const shine = cta.querySelector(".sh");
  function updateSc7(t) {
    const b = ease(t, 52.95, K.finaleLogo, E.inCubic) * (1 - ease(t, K.finaleLogo, K.finaleLogo + 1.4));
    bloom.style.opacity = b.toFixed(3);
    const m = spring(t - K.finaleLogo, 6, 7.5);
    const lockY = P(-120, -300);
    pos(lock, { y: lockY, o: clamp(m * 2), s: lerp(0.75, 1, clamp(m)), blur: (1 - clamp(m * 1.5)) * 10 });
    mark7.set(ease(t, K.finaleLogo, K.finaleLogo + 0.8), ease(t, K.finaleLogo + 0.05, K.finaleLogo + 1.3), 0.5 + 0.3 * Math.sin(t * 2.5), 1);
    const wl = ease(t, K.finaleLogo + 0.25, K.finaleLogo + 1.2, E.outQuint);
    wm.style.letterSpacing = lerp(0.55, 0.18, wl).toFixed(3) + "em";
    wmL.forEach((s, i) => { const p = ease(t, K.finaleLogo + 0.25 + i * 0.09, K.finaleLogo + 0.95 + i * 0.09, E.outQuint); s.style.opacity = p; s.style.filter = `blur(${((1 - p) * 12).toFixed(2)}px)`; s.style.transform = `translateY(${((1 - p) * 20).toFixed(1)}px)`; });
    pos(sub7, { y: lockY + P(150, 210) }); words(sub7, t, 54.45, 99, { st: 0.06 });
    claimEls.forEach((c, i) => { const p = ease(t, K.claim[i], K.claim[i] + 0.7, E.outQuint); c.style.opacity = p; c.style.transform = `translateY(${((1 - p) * 22).toFixed(1)}px)`; c.style.filter = `blur(${((1 - p) * 10).toFixed(2)}px)`; });
    pos(claim, { y: lockY + P(255, 420) });
    const cp = spring(t - K.cta, 7, 9);
    pos(cta, { y: lockY + P(395, 640), s: 0.85 + 0.15 * clamp(cp), o: clamp(cp * 1.6) });
    shine.style.left = (lerp(-120, 420, ease(t, K.cta + 0.5, K.cta + 1.4, E.io))) + "px";
  }

  // ───────────────────────── cursor choreography (targets read live from the DOM) ─────────────────────────
  const off = (x, y) => () => [W / 2 + x, H / 2 + y];
  cursorPath.push({ a: 16.75, b: 17.75, pts: [{ t: 16.7, target: off(P(420, 300), P(260, 120)) }, { t: 17.22, target: () => centerOf(sendBtn) }, { t: K.sendRemember, target: () => centerOf(sendBtn), click: true }, { t: 17.75, target: () => centerOf(sendBtn, 40, 60) }] });
  cursorPath.push({ a: 32.5, b: 33.95, pts: [{ t: 32.45, target: off(P(300, 200), P(260, 200)) }, { t: 32.85, target: () => centerOf(cb) }, { t: K.tick1, target: () => centerOf(cb), click: true }, { t: 33.5, target: () => centerOf(bA) }, { t: K.addToLife, target: () => centerOf(bA), click: true }, { t: 33.95, target: () => centerOf(bA, 60, 40) }] });
  cursorPath.push({ a: 34.7, b: 35.75, pts: [{ t: 34.7, target: () => centerOf(bB, -200, 120) }, { t: 35.2, target: () => centerOf(bB) }, { t: K.createAction, target: () => centerOf(bB), click: true }, { t: 35.75, target: () => centerOf(bB, 50, 60) }] });
  cursorPath.push({ a: 38.95, b: 40.1, pts: [{ t: 38.95, target: () => centerOf(bC, 260, 40) }, { t: 39.45, target: () => centerOf(bC) }, { t: K.sent, target: () => centerOf(bC), click: true }, { t: 40.1, target: () => centerOf(bC, 40, 60) }] });

  // bursts (confetti on completion, sparkle on CTA)
  burst(K.done + 0.3, W / 2, H / 2 + P(-40, -60) - 60, 70, ["#6aafe8", "#438ed4", "#9fdcbf", "#1f7a55", "#bbdfff", "#c9bfff"], 650, 3);
  burst(K.finaleLogo + 0.1, W / 2, H / 2 + P(-120, -300), 60, ["#bbdfff", "#6aafe8", "#dceeff", "#ffffff"], 900, 5);

  // ───────────────────────── frame ─────────────────────────
  const scenes = [
    { root: sc1, a: 0, b: K.impact + 1.2, u: updateSc1 },
    { root: sc2, a: K.implode, b: K.iris + 1.0, u: updateSc2 },
    { root: sc3, a: K.iris, b: 23.3, u: updateSc3 },
    { root: sc4, a: 22.3, b: 32.3, u: updateSc4 },
    { root: sc5, a: K.toAct, b: 43.3, u: updateSc5 },
    { root: sc6, a: 42.7, b: 53.6, u: updateSc6 },
    { root: sc7, a: 52.9, b: 60.01, u: updateSc7 },
  ];
  // stacking: background < scenes < fx < cursor
  stage.appendChild(fxLayer); stage.appendChild(top);
  function render(t) {
    updateBg(t);
    for (const s of scenes) { const on = t >= s.a && t < s.b; s.root.style.display = on ? "block" : "none"; if (on) s.u(t); }
    updateFx(t);
    updateCursor(t);
  }
  window.seek = (t) => { render(t); return true; };
  window.FILM = { W, H, V, DURATION: TL.DURATION, FPS: TL.FPS };

  const imgs = [...document.images];
  window.filmReady = Promise.all([document.fonts.ready, ...imgs.map((i) => (i.complete && i.naturalWidth ? 1 : new Promise((r) => { i.onload = r; i.onerror = r; })))]).then(() => { render(0); return true; });

  // ───────────────────────── preview ─────────────────────────
  function fit() { if (Q.get("render")) return; const k = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `scale(${k})`; document.body.style.height = "100vh"; }
  fit(); addEventListener("resize", fit);
  window.filmReady.then(() => {
    if (Q.get("t")) render(parseFloat(Q.get("t")));
    if (Q.get("play")) {
      const audio = new Audio("../audio/soundtrack.wav");
      const start = parseFloat(Q.get("from") || "0");
      audio.currentTime = start;
      const t0 = performance.now();
      audio.play().catch(() => {});
      const loop = () => { const t = start + (performance.now() - t0) / 1000; render(Math.min(t, TL.DURATION - 0.001)); if (t < TL.DURATION) requestAnimationFrame(loop); };
      loop();
    }
  });
})();
