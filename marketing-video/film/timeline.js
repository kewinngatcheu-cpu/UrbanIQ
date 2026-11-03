/**
 * ONE launch film — single source of truth for timing.
 * Used by the film (browser: window.TL) and by the sound design (node → cues.json → audio/compose.py),
 * so every whoosh, click and impact lands exactly on its visual event.
 */
(function (root) {
  const DURATION = 60;
  const FPS = 30;

  // Scene boundaries (seconds)
  const S = {
    problem: [0, 7],
    intro: [7, 14],
    remember: [14, 23],
    understand: [23, 32],
    act: [32, 43],
    montage: [43, 53],
    finale: [53, 60],
  };

  // Key moments
  const K = {
    implode: 7.0, // fragments start getting pulled in
    impact: 8.45, // logo birth (light burst)
    meet: 10.35,
    subtitle: 11.15,
    iris: 13.15, // ring expands → reveal product
    // REMEMBER
    typeRemember: [15.55, 17.05],
    sendRemember: 17.3,
    uploadStart: 18.5,
    uploadDone: 19.5,
    typeSearch: [20.25, 20.95],
    pushIn: 22.35,
    // UNDERSTAND
    scan: [23.7, 25.0],
    hl: [25.05, 25.65, 26.25],
    summaryIn: 26.9,
    related: [28.0, 28.35, 28.7, 29.05],
    toAct: 31.2,
    // ACT
    tick1: 32.95,
    addToLife: 33.65,
    createAction: 35.35,
    steps: [36.55, 37.2, 37.85, 38.5],
    sent: 39.6,
    done: 40.25,
    // MONTAGE
    cuts: [43.0, 44.6, 46.2, 47.8, 49.4],
    fan: 51.0,
    // FINALE
    finaleLogo: 53.35,
    claim: [55.5, 56.15, 56.8],
    cta: 57.6,
  };

  const REMEMBER_TEXT = "Passport expires on 14 March 2027 — book a renewal appointment in time.";
  const SEARCH_TEXT = "insurance";

  function typingCues(text, [a, b], kind) {
    const n = text.length;
    const out = [];
    for (let i = 0; i < n; i++) if (text[i] !== " " || i % 3 === 0) out.push({ t: +(a + ((b - a) * i) / n).toFixed(3), kind });
    return out;
  }

  /** Sound-design cue list (kind → synthesised in audio/compose.py) */
  function cues() {
    const c = [];
    // Scene 1: notification pings while the clutter builds up
    [0.55, 1.05, 1.4, 1.9, 2.3, 2.75, 3.05, 3.5, 3.8, 4.25, 4.5, 4.9, 5.15, 5.45, 5.7, 5.95, 6.2, 6.4].forEach((t, i) => c.push({ t, kind: "ping", v: 0.35 + i * 0.03 }));
    c.push({ t: 7.0, kind: "suck" });
    c.push({ t: K.impact, kind: "impact" });
    c.push({ t: 9.0, kind: "shimmer" });
    c.push({ t: K.meet, kind: "softhit" });
    c.push({ t: K.iris - 0.1, kind: "whoosh", v: 0.9 });
    c.push({ t: 14.1, kind: "whoosh", v: 0.5 });
    c.push({ t: 15.25, kind: "pop" });
    c.push(...typingCues(REMEMBER_TEXT, K.typeRemember, "key"));
    c.push({ t: K.sendRemember, kind: "click" });
    c.push({ t: K.sendRemember + 0.2, kind: "success" });
    c.push({ t: 18.0, kind: "whoosh", v: 0.55 });
    c.push({ t: K.uploadStart, kind: "pop" });
    c.push({ t: K.uploadDone, kind: "success" });
    c.push({ t: 19.0, kind: "pop" }, { t: 19.4, kind: "pop" });
    c.push(...typingCues(SEARCH_TEXT, K.typeSearch, "key"));
    c.push({ t: 21.1, kind: "tick" });
    c.push({ t: K.pushIn, kind: "whoosh", v: 0.8 });
    c.push({ t: K.scan[0], kind: "scan" });
    K.hl.forEach((t) => c.push({ t, kind: "highlight" }));
    c.push({ t: K.summaryIn, kind: "pop" });
    c.push({ t: K.summaryIn + 0.5, kind: "pop" });
    K.related.forEach((t) => c.push({ t, kind: "connect" }));
    c.push({ t: K.toAct, kind: "whoosh", v: 0.8 });
    c.push({ t: K.tick1, kind: "tick" });
    c.push({ t: K.addToLife, kind: "click" });
    c.push({ t: K.addToLife + 0.25, kind: "success" });
    c.push({ t: 34.0, kind: "whoosh", v: 0.4 });
    c.push({ t: K.createAction, kind: "click" });
    c.push({ t: 35.85, kind: "whoosh", v: 0.5 });
    K.steps.forEach((t) => c.push({ t, kind: "tick" }));
    c.push({ t: K.sent, kind: "click" });
    c.push({ t: K.done, kind: "done" });
    K.cuts.forEach((t, i) => c.push({ t: t - 0.12, kind: "whoosh", v: i === 0 ? 0.9 : 0.65 }));
    c.push({ t: K.fan - 0.1, kind: "whoosh", v: 0.8 });
    c.push({ t: 52.85, kind: "suck" });
    c.push({ t: K.finaleLogo, kind: "impact2" });
    K.claim.forEach((t) => c.push({ t, kind: "softhit", v: 0.5 }));
    c.push({ t: K.cta, kind: "shimmer" });
    return c.sort((a, b) => a.t - b.t);
  }

  const TL = { DURATION, FPS, S, K, REMEMBER_TEXT, SEARCH_TEXT, cues };
  if (typeof module !== "undefined" && module.exports) module.exports = TL;
  else root.TL = TL;
})(typeof window !== "undefined" ? window : globalThis);
