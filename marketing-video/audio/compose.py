#!/usr/bin/env python3
"""
ONE launch film — original score + sound design, synthesised from scratch with numpy.
No samples, no third-party audio: everything below is generated, so the soundtrack is fully owned.

    python3 marketing-video/audio/compose.py     → audio/soundtrack_raw.wav (then loudness-normalised by render step)

Structure (follows film/timeline.js via cues.json):
  0–7   tension: low drone that slowly opens, clock ticks, heartbeat, notification pings
  7–8.45 everything is sucked in → IMPACT + bright Dmaj9 bloom (logo birth)
  8.45–14 airy pad + gentle arpeggio ("Meet ONE")
  14–43  groove builds in three steps (Remember / Understand / Act), lead motif enters with ACT
  43–53  montage: harmonic rhythm doubles, full energy
  53.35  final impact, resolve to Dmaj9, long tail, claim bells
"""
import json, os, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100
CUES = json.load(open(os.path.join(HERE, "cues.json")))
DUR = CUES["duration"] + 0.0
N = int(SR * DUR)
rng = np.random.default_rng(1234)

mus = np.zeros((2, N))   # music bus
sfx = np.zeros((2, N))   # sound-effects bus
pad_bus = np.zeros((2, N))  # pads (sidechained to the kick)
kick_env = np.zeros(N)


def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def T(sec): return np.arange(int(sec * SR)) / SR


def add(bus, t0, sig, gain=1.0, pan=0.0):
    """mix mono or stereo signal into a bus at time t0 with equal-power pan (-1..1)"""
    i = int(round(t0 * SR))
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.vstack([sig * l * 1.414, sig * r * 1.414]) / 1.414
    if i < 0: sig = sig[:, -i:]; i = 0
    n = min(sig.shape[1], N - i)
    if n > 0: bus[:, i:i + n] += sig[:, :n] * gain


def env_adsr(n, a, d, s, r, sustain_len=None):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    sl = n - a - d - r if sustain_len is None else int(sustain_len * SR)
    sl = max(sl, 0)
    e = np.concatenate([np.linspace(0, 1, max(a, 1)), np.linspace(1, s, max(d, 1)), np.full(sl, s), np.linspace(s, 0, max(r, 1))])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def fft_filter(x, resp):
    """static zero-phase filter; resp(freqs) → gain"""
    n = len(x); X = np.fft.rfft(x, n); f = np.fft.rfftfreq(n, 1 / SR)
    return np.fft.irfft(X * resp(f), n)


def lp(fc, order=4): return lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order))
def hp(fc, order=4): return lambda f: 1 / np.sqrt(1 + (np.maximum(fc, 1e-6) / np.maximum(f, 1e-6)) ** (2 * order))
def bp(fc, q=1.0): return lambda f: np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) * q * 2) ** 2)


def tv_filter(x, fc_of_t, kind="lp", q=1.0, win=2048):
    """time-varying filter via STFT (hann, 75% overlap)"""
    hop = win // 4; w = np.hanning(win)
    pad = np.pad(x, (win, win + win)); out = np.zeros_like(pad); norm = np.zeros_like(pad)
    f = np.fft.rfftfreq(win, 1 / SR)
    for s in range(0, len(pad) - win, hop):
        t = (s - win + win / 2) / SR
        fc = max(20.0, fc_of_t(t))
        g = lp(fc, 3)(f) if kind == "lp" else hp(fc, 3)(f) if kind == "hp" else bp(fc, q)(f)
        out[s:s + win] += np.fft.irfft(np.fft.rfft(pad[s:s + win] * w) * g, win) * w
        norm[s:s + win] += w * w
    return (out / np.maximum(norm, 1e-6))[win:win + len(x)]


def saw(freq, t, harm=24, roll=1.0, detune_cents=0.0, phase=0.0):
    f = freq * 2 ** (detune_cents / 1200)
    out = np.zeros_like(t)
    for k in range(1, harm + 1):
        if f * k > SR * 0.45: break
        out += np.sin(2 * np.pi * f * k * t + phase * k) / k ** roll
    return out


def noise(n): return rng.standard_normal(n)


def reverb_ir(sec=2.8, decay=3.2, bright=6000, seed=7):
    r = np.random.default_rng(seed)
    n = int(sec * SR); t = np.arange(n) / SR
    ir = np.vstack([r.standard_normal(n), r.standard_normal(n)]) * np.exp(-decay * t)
    ir = np.vstack([fft_filter(ir[0], lp(bright, 2)), fft_filter(ir[1], lp(bright * 0.9, 2))])
    ir[:, : int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))  # predelay-ish soft onset
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def convolve(x, ir):
    out = np.zeros((2, x.shape[1]))
    n = x.shape[1] + ir.shape[1]
    nfft = 1 << (n - 1).bit_length()
    for c in range(2):
        out[c] = np.fft.irfft(np.fft.rfft(x[c], nfft) * np.fft.rfft(ir[c], nfft), nfft)[: x.shape[1]]
    return out


# ───────────────────────── instruments ─────────────────────────
def pad_voice(m, dur, att=1.2, rel=1.8, bright=0.0):
    t = T(dur + rel)
    sig = 0
    for dc, ph in ((-7, 0.0), (0, 1.3), (6, 2.1)):
        sig = sig + saw(mtof(m), t, harm=14, roll=1.6 - 0.3 * bright, detune_cents=dc, phase=ph)
    sig *= env_adsr(len(t), att, 0.5, 0.85, rel, sustain_len=max(0, dur - att - 0.5))
    return sig / 3


def pluck(m, dur=0.45, bright=1.0):
    t = T(dur)
    f = mtof(m); out = np.zeros_like(t)
    for k in range(1, 12):
        if f * k > SR * 0.45: break
        out += np.sin(2 * np.pi * f * k * t) / k ** 1.3 * np.exp(-t * (6 + k * 5 / bright))
    out *= np.minimum(1, t / 0.003)
    return out


def bell(m, dur=1.6, gain=1.0):
    t = T(dur); f = mtof(m); out = np.zeros_like(t)
    for ratio, amp, dec in ((1, 1, 2.2), (2.0, 0.45, 3.5), (2.76, 0.3, 4.5), (4.07, 0.18, 6), (5.4, 0.1, 8)):
        out += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * dec)
    return out * np.minimum(1, t / 0.002) * gain


def kick(gain=1.0):
    t = T(0.5)
    f = 45 + 95 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7) + 0.25 * fft_filter(noise(len(t)), bp(3000, 0.7)) * np.exp(-t * 120)
    return np.tanh(s * 1.4) * gain


def snap(gain=1.0):
    t = T(0.3); n = noise(len(t))
    body = fft_filter(n, bp(1800, 0.8))
    e = np.zeros_like(t)
    for d in (0, 0.009, 0.018): e += np.exp(-np.maximum(t - d, 0) * 60) * (t >= d)
    e += 0.6 * np.exp(-t * 18)
    return body * e * 0.5 * gain


def hat(open_=False, gain=1.0):
    t = T(0.35 if open_ else 0.08)
    s = fft_filter(noise(len(t)), hp(7500, 3)) * np.exp(-t * (9 if open_ else 55))
    return s * gain * 0.6


def boom(gain=1.0, dur=3.0):
    t = T(dur)
    f = 30 + 32 * np.exp(-t * 3)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.3)
    s = np.tanh(s * 2.0) * 0.8
    s += fft_filter(noise(len(t)), lp(900, 2)) * np.exp(-t * 4) * 0.5
    s += fft_filter(noise(len(t)), bp(3500, 0.5)) * np.exp(-t * 14) * 0.25
    return s * gain


def whoosh(dur=0.9, gain=1.0, up=True):
    n = int(dur * SR); t = np.arange(n) / SR
    pk = 0.62 if up else 0.35
    e = np.where(t < dur * pk, (t / (dur * pk)) ** 2.2, np.exp(-(t - dur * pk) / (dur * 0.12)))
    lo, hi = 300, 5500
    s = tv_filter(noise(n), lambda tt: lo * (hi / lo) ** np.clip(tt / dur, 0, 1), kind="bp", q=0.9)
    s = s / (np.max(np.abs(s)) + 1e-9)
    pan = np.linspace(-0.7, 0.7, n)
    st = np.vstack([s * e * np.cos((pan + 1) * np.pi / 4), s * e * np.sin((pan + 1) * np.pi / 4)]) * 1.2
    return st * gain


def riser(dur, gain=1.0, f0=200, f1=4000):
    n = int(dur * SR); t = np.arange(n) / SR
    s = tv_filter(noise(n), lambda tt: f0 * (f1 / f0) ** np.clip(tt / dur, 0, 1) ** 1.6, kind="bp", q=1.4)
    s = s / (np.max(np.abs(s)) + 1e-9)
    pitch = 110 * 2 ** (2.5 * (t / dur) ** 2)
    tone = np.sin(2 * np.pi * np.cumsum(pitch) / SR) * 0.25 + np.sin(2 * np.pi * np.cumsum(pitch * 1.5) / SR) * 0.12
    return (s * 0.8 + tone) * (t / dur) ** 2.5 * gain


def blip(f0, f1, dur=0.08, gain=1.0):
    t = T(dur); f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (40 / dur * 0.08)) * np.minimum(1, t / 0.002) * gain


def click(gain=1.0):
    t = T(0.05)
    return (np.sin(2 * np.pi * 2300 * t) * np.exp(-t * 160) + 0.5 * np.sin(2 * np.pi * 4800 * t) * np.exp(-t * 300) + 0.3 * fft_filter(noise(len(t)), hp(4000)) * np.exp(-t * 400)) * gain


def keytick(gain=1.0):
    t = T(0.035)
    f = 1500 + rng.random() * 900
    return (0.6 * fft_filter(noise(len(t)), bp(f * 2.2, 1.2)) * np.exp(-t * 260) + 0.4 * np.sin(2 * np.pi * f * t) * np.exp(-t * 300)) * gain


# ───────────────────────── score ─────────────────────────
CH = {
    "Dmaj9": [50, 54, 57, 61, 64], "Bm11": [47, 50, 54, 57, 64], "G": [43, 50, 54, 57, 59], "D/F#": [42, 50, 54, 57, 64],
    "Em9": [40, 50, 54, 55, 59], "A": [45, 49, 52, 57, 61], "Asus": [45, 50, 52, 57, 62], "Dfinal": [38, 50, 54, 57, 61, 64, 69],
}
BASS = {"Dmaj9": 38, "Bm11": 35, "G": 31, "D/F#": 30, "Em9": 28, "A": 33, "Asus": 33, "Dfinal": 26}
TIMELINE = [(8.45, "Dmaj9"), (11.45, "Bm11"), (14, "G"), (18, "D/F#"), (22, "Em9"), (26, "A"), (30, "G"), (34, "D/F#"), (38, "Em9"), (42, "Asus"),
            (43, "G"), (45, "D/F#"), (47, "Em9"), (49, "A"), (51, "G"), (52.85, None), (53.35, "Dfinal"), (DUR, None)]
MOTIF = {
    "G": [(0, 71, 2), (2, 69, 1), (3, 66, 1), (4, 74, 3), (7, 71, 1)],
    "D/F#": [(0, 69, 2), (2, 66, 1), (3, 69, 1), (4, 76, 3), (7, 74, 1)],
    "Em9": [(0, 71, 2), (2, 74, 1), (3, 78, 1), (4, 76, 2), (6, 74, 2)],
    "A": [(0, 73, 3), (3, 76, 1), (4, 69, 4)],
    "Asus": [(0, 74, 2)],
}
ARP = [0, 2, 1, 3, 2, 4, 3, 1]


def level(t):
    """arrangement intensity 0..4"""
    if t < 14: return 0
    if t < 23: return 1
    if t < 32: return 2
    if t < 43: return 3
    return 4


def build_score():
    # --- tension drone (0 → 8.45)
    t = T(9.0)
    drone = 0
    for m, g in ((38, 1.0), (45, 0.6), (51, 0.22), (26, 0.8)):
        drone = drone + g * (saw(mtof(m), t, harm=30, roll=1.2, detune_cents=-5) + saw(mtof(m), t, harm=30, roll=1.2, detune_cents=6, phase=1.1))
    drone = tv_filter(drone, lambda tt: 160 * (12 ** np.clip(tt / 8.4, 0, 1) ** 1.5), kind="lp")
    drone *= np.minimum(1, t / 2.0) * np.where(t < 8.45, 1, np.exp(-(t - 8.45) * 12))
    trem = 1 + 0.15 * np.sin(2 * np.pi * t * (2 + 4 * t / 8.4))
    add(pad_bus, 0, drone * trem * 0.055)
    # heartbeat + clock ticks building pressure
    for b in np.arange(0.0, 7.0, 1.0):
        g = 0.35 + 0.5 * b / 7
        add(mus, b, kick(0.34 * g)); add(mus, b + 0.22, kick(0.22 * g))
    for k, b in enumerate(np.arange(1.0, 7.0, 0.25)):
        g = (0.1 + 0.35 * (b - 1) / 6) * (1.0 if k % 2 == 0 else 0.65)
        add(mus, b, click(0.22 * g), pan=0.35 if k % 2 else -0.35)
    add(sfx, 4.4, riser(2.6, 0.12, 300, 6000))

    # --- chords, bass, arps, drums, lead
    for i, (start, name) in enumerate(TIMELINE[:-1]):
        end = TIMELINE[i + 1][0]
        if name is None: continue
        dur = end - start
        lv = level(start)
        notes = CH[name]
        # pad
        att = 0.05 if name in ("Dmaj9", "Dfinal") and start in (8.45, 53.35) else (0.8 if lv < 4 else 0.25)
        rel = 4.5 if name == "Dfinal" else 1.6
        pdur = (DUR - start - 0.3) if name == "Dfinal" else dur
        for m in notes:
            add(pad_bus, start, pad_voice(m, pdur, att=att, rel=rel, bright=0.6 if lv >= 3 else 0.2), 0.05 if lv < 4 else 0.06, pan=(m % 5 - 2) * 0.18)
        if name in ("Dmaj9", "Dfinal"):
            for m in notes[-3:]:
                add(pad_bus, start, pad_voice(m + 12, pdur, att=0.02, rel=rel, bright=1.0), 0.03, pan=0.3 * np.sin(m))
        # arpeggio
        if start >= 10.35 or name == "Bm11":
            step = 0.125 if lv >= 1 else 0.25
            a0 = max(start, 10.35)
            for k, b in enumerate(np.arange(a0, end - 0.01, step)):
                if name == "Dfinal" and b > start + 3.0: break
                idx = ARP[k % len(ARP)]
                m = notes[min(idx, len(notes) - 1)] + 12 + (12 if lv >= 4 and k % 8 == 7 else 0)
                g = (0.05 if lv == 0 else 0.065 + 0.01 * lv) * (1 if k % 2 == 0 else 0.7)
                if name == "Dfinal": g *= np.exp(-(b - start) * 0.9)
                add(mus, b, pluck(m, 0.4, 1.0 + 0.4 * lv), g, pan=0.45 * np.sin(k * 1.7))
        if start < 14: continue
        if name == "Dfinal":
            add(mus, start, saw(mtof(BASS[name]), T(5.5), harm=6, roll=2) * np.exp(-T(5.5) * 0.7) * 0.15)
            continue
        # bass (8ths, octave pulse)
        for k, b in enumerate(np.arange(start, end - 0.01, 0.25)):
            m = BASS[name] + (12 if k % 2 else 0)
            tt = T(0.24)
            s = saw(mtof(m), tt, harm=8, roll=1.8) * np.exp(-tt * 7) * np.minimum(1, tt / 0.004)
            add(mus, b, s, 0.085 if lv < 4 else 0.1)
        # drums
        for k, b in enumerate(np.arange(start, end - 0.01, 0.5)):
            if 52.6 <= b: break
            beat = int(round((b - 14) / 0.5))
            add(mus, b, kick(0.55 if lv < 4 else 0.68)); kick_env[int(b * SR): int(b * SR) + int(0.25 * SR)] += np.linspace(1, 0, int(0.25 * SR))[: max(0, min(int(0.25 * SR), N - int(b * SR)))]
            if beat % 2 == 1 and lv >= 1: add(mus, b, snap(0.45 if lv < 3 else 0.6), pan=0.05)
            if lv >= 2: add(mus, b + 0.25, hat(open_=(lv >= 3 and beat % 2 == 1), gain=0.14 if lv < 4 else 0.18), pan=0.3)
            if lv >= 3: add(mus, b, hat(gain=0.08), pan=-0.3)
        # lead motif from ACT on
        if lv >= 3 and name in MOTIF:
            beat_len = 0.5 if dur >= 3.9 else 0.25
            for (bb, m, ln) in MOTIF[name]:
                if bb * beat_len >= dur: continue
                tt = T(ln * beat_len + 0.6)
                vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * tt) * np.minimum(1, tt / 0.3)
                f = mtof(m) * vib
                ph = 2 * np.pi * np.cumsum(f) / SR
                s = np.sin(ph) + 0.3 * np.sin(3 * ph) + 0.12 * np.sin(5 * ph) + 0.2 * np.sin(2 * ph)
                s *= env_adsr(len(tt), 0.02, 0.2, 0.7, 0.5, sustain_len=max(0, ln * beat_len - 0.22))
                s = fft_filter(s, lp(3200, 2))
                gl = 0.05 if lv == 3 else 0.06
                add(mus, start + bb * beat_len, s, gl, pan=-0.1)
                add(mus, start + bb * beat_len + 0.375, s, gl * 0.35, pan=0.5)   # dotted-8th echo
                add(mus, start + bb * beat_len + 0.75, s, gl * 0.15, pan=-0.5)
    # risers into the big moments
    add(sfx, 40.9, riser(2.1, 0.14, 250, 7000))
    add(sfx, 50.9, riser(1.95, 0.12, 300, 8000))
    # drum fill before montage
    for k, b in enumerate(np.arange(42.0, 43.0, 0.125)):
        add(mus, b, snap(0.15 + 0.35 * k / 8), pan=np.sin(k) * 0.3)
    # claim bells (finale)
    for t0, m in zip(CUES["K"]["claim"], (74, 78, 81)):
        add(mus, t0, bell(m, 2.5, 0.09), pan=-0.3 + 0.3 * (m - 74) / 4)
    add(mus, CUES["K"]["cta"] + 0.05, bell(86, 3.0, 0.06), pan=0.2)


def build_sfx():
    pings = [74, 77, 80, 75, 79, 82, 76, 81, 78, 83, 73, 84]
    for i, c in enumerate(CUES["cues"]):
        t0, k, v = c["t"], c["kind"], c.get("v", 1.0)
        if k == "ping":
            m = pings[i % len(pings)]
            s = bell(m, 0.6, 1) * 0.6 + bell(m + 7, 0.6, 0.3)
            add(sfx, t0, s, 0.045 * v * 2, pan=np.sin(i * 2.3) * 0.8)
        elif k == "suck":
            d = 1.45
            n = int(d * SR); tt = np.arange(n) / SR
            ns = tv_filter(noise(n), lambda x: 200 * 30 ** np.clip(x / d, 0, 1) ** 2, kind="lp")
            ns = ns / (np.max(np.abs(ns)) + 1e-9) * (tt / d) ** 3
            add(sfx, t0, ns, 0.22)
        elif k == "impact":
            add(sfx, t0, boom(0.55, 4.0))
            add(sfx, t0, convolve(np.vstack([bell(86, 0.3, 1), bell(93, 0.3, 0.6)]), reverb_ir(3.5, 1.5))[:, : int(3.5 * SR)] * 0.1)
        elif k == "impact2":
            add(sfx, t0, boom(0.45, 4.5))
        elif k == "shimmer":
            for j, m in enumerate((86, 90, 93, 98, 102)):
                add(sfx, t0 + j * 0.07, bell(m, 1.8, 0.05), pan=-0.6 + j * 0.3)
        elif k == "softhit":
            tt = T(0.9)
            s = np.sin(2 * np.pi * np.cumsum(80 + 60 * np.exp(-tt * 20)) / SR) * np.exp(-tt * 5) + fft_filter(noise(len(tt)), bp(2500, 0.6)) * np.exp(-tt * 9) * 0.3
            add(sfx, t0, s, 0.22 * v)
        elif k == "whoosh":
            add(sfx, t0 - 0.45, whoosh(0.85, 0.16 * v))
        elif k == "pop":
            add(sfx, t0, blip(520, 1100, 0.09, 0.16), pan=0.15)
        elif k == "key":
            add(sfx, t0, keytick(0.08), pan=rng.uniform(-0.2, 0.2))
        elif k == "click":
            add(sfx, t0, click(0.2))
        elif k == "tick":
            add(sfx, t0, blip(1200, 1800, 0.06, 0.12)); add(sfx, t0, click(0.06))
        elif k == "success":
            add(sfx, t0, bell(88, 1.0, 0.06), pan=-0.1); add(sfx, t0 + 0.09, bell(95, 1.0, 0.05), pan=0.1)
        elif k == "done":
            for j, m in enumerate((86, 90, 93, 98)):
                add(sfx, t0 + j * 0.06, bell(m, 2.2, 0.07), pan=-0.4 + j * 0.27)
            add(sfx, t0, boom(0.12, 1.5))
        elif k == "highlight":
            d = 0.42; n = int(d * SR); tt = np.arange(n) / SR
            s = tv_filter(noise(n), lambda x: 1500 * 3 ** np.clip(x / d, 0, 1), kind="bp", q=1.5)
            s = s / (np.max(np.abs(s)) + 1e-9) * np.sin(np.pi * tt / d) ** 2
            add(sfx, t0, s, 0.06, pan=0.2)
        elif k == "scan":
            d = 1.3; n = int(d * SR); tt = np.arange(n) / SR
            s = tv_filter(noise(n), lambda x: 600 * 8 ** np.clip(x / d, 0, 1), kind="bp", q=2.0)
            s = s / (np.max(np.abs(s)) + 1e-9) * np.sin(np.pi * tt / d)
            add(sfx, t0, s, 0.07)
            add(sfx, t0, np.sin(2 * np.pi * np.cumsum(400 + 500 * tt / d) / SR) * np.sin(np.pi * tt / d) * 0.25, 0.08)
        elif k == "connect":
            j = CUES["K"]["related"].index(t0) if t0 in CUES["K"]["related"] else 0
            m = (81, 83, 86, 88)[j]
            add(sfx, t0, blip(mtof(m) * 0.7, mtof(m), 0.07, 0.1), pan=-0.5)
            add(sfx, t0 + 0.02, bell(m, 0.8, 0.035), pan=-0.5)


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    pcm = (x.T * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    print("composing score…")
    build_score()
    print("sound design…")
    build_sfx()
    # sidechain: pads breathe with the kick
    sc = 1 - 0.55 * np.clip(fft_filter(kick_env, lp(30, 1)), 0, 1)
    pads = pad_bus * sc
    print("reverb…")
    ir = reverb_ir(3.2, 2.4)
    wet_m = convolve(mus * 0.5 + pads * 0.8, ir)
    wet_s = convolve(sfx * 0.6, reverb_ir(2.0, 3.5, seed=3))
    # arrangement automation (dB) → a real arc: tense & quiet → impact → build in three steps → peak → resolve
    pts = [(0, -11), (6.9, -5), (8.44, -3), (8.45, 0), (9.5, -2), (13.9, -4), (14, -6), (22.9, -5), (23, -3.5), (31.9, -3), (32, -1.5), (42.9, -1), (43, 0.5), (52.8, 0.5), (53.35, 0), (60, -1)]
    tt = np.arange(N) / SR
    g = 10 ** (np.interp(tt, [p[0] for p in pts], [p[1] for p in pts]) / 20)
    music = (mus + pads + 0.32 * wet_m) * g
    mix = music + sfx + 0.2 * wet_s
    # gentle master: low-cut, soft clip, fade tail
    for c in range(2): mix[c] = fft_filter(mix[c], hp(28, 2))
    peak = np.max(np.abs(mix)); mix = mix / peak * 0.9
    mix = np.tanh(mix * 1.3) / np.tanh(1.3)
    tail = np.ones(N); fo = int(1.2 * SR); tail[-fo:] = np.linspace(1, 0, fo) ** 2
    mix *= tail
    write_wav(os.path.join(HERE, "soundtrack_raw.wav"), mix * 0.95)
    print("✓ audio/soundtrack_raw.wav")
