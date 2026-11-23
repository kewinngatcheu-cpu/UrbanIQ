"""
NGCX — original score & sound design, synthesised from scratch (no samples,
no third-party material → no licensing constraints).

All cue points come from src/timeline.json, so sound and picture stay locked.
Output: public/audio/ngcx_score.wav (48 kHz, 24-bit-equivalent float → 16-bit PCM, stereo)

Musical idea: D minor, 96 BPM. Tension (scattered information) → structure
(logo) → pulse (product) → build (signals to opportunities) → resolve to
D major (KNOW. DECIDE. GROW.).
"""
import json, os, wave
import numpy as np

SR = 48000
T = json.load(open(os.path.join(os.path.dirname(__file__), "..", "src", "timeline.json")))
DUR = T["durationSec"]
A = T["audio"]
N = int(DUR * SR)
rng = np.random.default_rng(42)
BEAT = 60 / A["bpm"]

L = np.zeros(N); R = np.zeros(N)          # dry bus
RL = np.zeros(N); RR = np.zeros(N)        # reverb send

def midi(m): return 440.0 * 2 ** ((m - 69) / 12)

def add(sig, t0, gain=1.0, pan=0.0, send=0.25):
    i0 = int(t0 * SR)
    if i0 >= N: return
    if i0 < 0: sig = sig[-i0:]; i0 = 0
    n = min(len(sig), N - i0)
    if sig.ndim == 1:
        l = sig[:n] * gain * np.sqrt(0.5 * (1 - pan)); r = sig[:n] * gain * np.sqrt(0.5 * (1 + pan))
    else:
        l = sig[:n, 0] * gain; r = sig[:n, 1] * gain
    L[i0:i0+n] += l; R[i0:i0+n] += r
    RL[i0:i0+n] += l * send; RR[i0:i0+n] += r * send

def fft_filter(x, lo=None, hi=None, slope=0.25):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if hi: g *= 1 / (1 + (f / hi) ** (2 / slope * 0.25 * 4))
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * g, len(x))

def env_adsr(n, a, d, s, r, sus_len):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), 1.0)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / max(d, 1e-4), e)
    e = np.where((t >= a + d) & (t < sus_len), s, e)
    e = np.where(t >= sus_len, s * np.exp(-(t - sus_len) / max(r, 1e-4) * 3), e)
    return e

# ───────────────────────── instruments ─────────────────────────
def pad_note(freq, length, att=1.6, rel=2.2, bright=4.0):
    n = int((length + rel) * SR); t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for det, pan in ((-7, -0.7), (0, 0.0), (7, 0.7)):
        f = freq * 2 ** (det / 1200)
        s = np.zeros(n)
        for h in range(1, 11):
            s += np.sin(2 * np.pi * f * h * t + rng.uniform(0, 6.28)) * (1 / h) * np.exp(-h / bright)
        out[:, 0] += s * np.sqrt(0.5 * (1 - pan)); out[:, 1] += s * np.sqrt(0.5 * (1 + pan))
    e = np.clip(t / att, 0, 1) ** 2 * np.where(t > length, np.exp(-(t - length) / rel * 3), 1)
    lfo = 1 + 0.08 * np.sin(2 * np.pi * 0.18 * t + rng.uniform(0, 6))
    return out * (e * lfo)[:, None] * 0.08

def pluck(freq, dec=0.32):
    n = int(1.4 * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * 2 * freq * t) * np.exp(-t * 18) + 0.12 * np.sin(2 * np.pi * 3 * freq * t) * np.exp(-t * 30)
    return s * np.exp(-t / dec) * np.clip(t / 0.003, 0, 1)

def kick():
    n = int(0.6 * SR); t = np.arange(n) / SR
    f = 44 + 80 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) * np.clip(t / 0.002, 0, 1)

def impact(deep=1.0):
    n = int(5.0 * SR); t = np.arange(n) / SR
    f = 30 + 55 * np.exp(-t * 5)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.1)
    noise = fft_filter(rng.standard_normal(n), lo=60, hi=1800) * np.exp(-t * 6) * 0.35
    shimmer = fft_filter(rng.standard_normal(n), lo=4000, hi=12000) * np.exp(-t * 3) * 0.05
    return (boom * deep + noise + shimmer) * np.clip(t / 0.004, 0, 1)

def riser(length):
    n = int(length * SR); t = np.arange(n) / SR; x = t / length
    noise = rng.standard_normal(n)
    # crossfade between progressively brighter noise bands
    bands = [fft_filter(noise, lo=200, hi=900), fft_filter(noise, lo=800, hi=3000), fft_filter(noise, lo=2500, hi=9000)]
    w = [np.clip(1 - x * 2, 0, 1), np.clip(1 - abs(x - 0.5) * 2, 0, 1), np.clip(x * 2 - 1, 0, 1)]
    s = sum(b * ww for b, ww in zip(bands, w)) * (x ** 2.2) * 0.5
    gl = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (x * 2)) / SR) * (x ** 3) * 0.08
    s = s + gl
    s *= np.where(x > 0.97, (1 - x) / 0.03, 1)  # cut just before the hit
    return s

def whoosh(length=0.75):
    n = int(length * SR); t = np.arange(n) / SR; x = t / length
    s = fft_filter(rng.standard_normal(n), lo=350, hi=4500) * np.sin(np.pi * x) ** 2
    return np.stack([s * (1 - x), s * x], 1) * 0.55

def tick(freq=2600):
    n = int(0.09 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * t) * 0.6 + np.sin(2 * np.pi * freq * 1.5 * t) * 0.25) * np.exp(-t * 70)

def chime(freq, dec=1.6):
    n = int(3.2 * SR); t = np.arange(n) / SR
    mod = np.sin(2 * np.pi * freq * 3.5 * t) * 1.8 * np.exp(-t * 4)
    return np.sin(2 * np.pi * freq * t + mod) * np.exp(-t / dec * 2) * np.clip(t / 0.004, 0, 1)

def blip(freq):
    n = int(0.5 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * np.exp(-t * 14) * np.clip(t / 0.003, 0, 1)

# ───────────────────────── harmony / score ─────────────────────────
D = 50  # D3
chords = [
    # (start, end, midi notes) — D minor world → D major resolution
    (0.0, 6.2,  [38, 50, 57, 64]),          # Dm(add9) colour, sparse
    (6.0, 12.8, [38, 50, 53, 57, 64]),      # Dm9 — more tension
    (12.6, 15.8, [34, 46, 53, 57, 62]),     # Bbmaj7 lift into logo
    (15.6, 19.0, [38, 50, 57, 62, 64, 69]), # Dsus/add9 (logo moment)
    (18.8, 22.8, [38, 50, 53, 57, 64]),     # Dm9
    (22.6, 26.8, [34, 46, 53, 57, 62]),     # Bbmaj7
    (26.6, 30.8, [41, 53, 57, 60, 64]),     # Fmaj7
    (30.6, 35.0, [36, 48, 55, 60, 64]),     # C(add9)
    (34.8, 38.0, [43, 55, 58, 62, 69]),     # Gm9
    (37.8, 41.0, [34, 46, 53, 57, 62]),     # Bbmaj7
    (40.8, 45.7, [36, 48, 55, 60, 62, 67]), # Csus → tension
    (45.6, 55.0, [38, 50, 54, 57, 64, 69]), # D major add9 — resolution
]
for (s, e, notes) in chords:
    last = s > 45
    length = (e - s) if not last else 6.6
    for m in notes:
        g = 0.55 if m < 45 else 1.0
        if s < 12: g *= 0.6
        add(pad_note(midi(m), length, att=1.4 if s > 0 else 2.5, rel=2.6 if last else 1.6, bright=3.0 if s < 15 else 4.5), s, gain=g, send=0.45)

# sub drone
t = np.arange(N) / SR
drone_env = np.interp(t, [0, 2, 12, 15.6, 19, 35, 44, 45.6, 52, 55], [0, 0.5, 0.7, 1.0, 0.6, 0.7, 1.0, 1.0, 0.4, 0])
dfreq = np.where(t < 45.6, midi(26), midi(26))
drone = np.sin(2 * np.pi * np.cumsum(dfreq) / SR) * 0.11 * drone_env
add(drone, 0, send=0.05)

# rhythmic pulse: product (19–35s) & build (35–44.5s)
arp_sets = {
    18.8: [62, 65, 69, 72], 22.6: [62, 65, 69, 74], 26.6: [60, 65, 69, 72], 30.6: [60, 64, 67, 72],
    34.8: [62, 67, 70, 74], 37.8: [62, 65, 70, 74], 40.8: [60, 64, 67, 72],
}
keys = sorted(arp_sets)
step = BEAT / 2
tt = 19.0
i = 0
while tt < 44.4:
    cur = [k for k in keys if k <= tt][-1]
    notes = arp_sets[cur]
    dens = 1 if tt < 34.8 else 2
    for d in range(dens):
        st = tt + d * step / 2
        n = notes[(i * (1 if dens == 1 else 1) + d) % len(notes)]
        build = np.interp(st, [19, 22, 34.8, 44.4], [0.4, 0.75, 0.8, 1.1])
        add(pluck(midi(n)), st, gain=0.085 * build, pan=0.35 * np.sin(i * 1.3), send=0.35)
    i += 1
    tt += step

# soft kick on 1 & 3 from 22.6s, every beat in the build
kt = 22.6
b = 0
while kt < 44.5:
    if kt >= 34.8 or b % 2 == 0:
        add(kick(), kt, gain=0.33 if kt < 34.8 else 0.4, send=0.02)
    kt += BEAT; b += 1

# ───────────────────────── sound design ─────────────────────────
for k, ti in enumerate(A["impacts"]):
    add(impact(1.0 if k else 0.7), ti, gain=0.55 if k else 0.4, send=0.5)
    if k:  # tonal sparkle on logo ignition (the X)
        for m, g in ((86, 0.05), (93, 0.035), (98, 0.02)):
            add(chime(midi(m), 2.4), ti, gain=g, pan=0.2, send=0.6)
for s, e in A["risers"]:
    add(riser(e - s), s, gain=0.32, send=0.35)
for w in A["whooshes"]:
    add(whoosh(), w - 0.3, gain=0.26, send=0.3)
for k, ti in enumerate(A["ticks"]):
    add(tick(2400 + (k % 3) * 300), ti, gain=0.05, pan=((k % 5) - 2) * 0.2, send=0.15)
for ti in A["clicks"]:
    add(tick(1800), ti, gain=0.09, send=0.2)
    add(blip(midi(81)), ti, gain=0.05, send=0.4)
for ti in A["drops"]:
    add(chime(midi(76), 1.2), ti, gain=0.05, send=0.5)
for k, ti in enumerate(A["nodes"]):
    add(blip(midi([69, 72, 74, 76, 81][k])), ti, gain=0.09, pan=-0.6 + k * 0.3, send=0.5)
for k, ti in enumerate(A["chimes"]):
    add(chime(midi([74, 76, 79, 81][k]), 1.8), ti, gain=0.07, send=0.55)
for k, ti in enumerate(A["words"]):
    add(chime(midi(86), 1.0), ti, gain=0.022, pan=0.1, send=0.6)

# ───────────────────────── reverb & master ─────────────────────────
def reverb(x, seconds=3.2, seed=0):
    n = int(seconds * SR); tt = np.arange(n) / SR
    ir = np.random.default_rng(seed).standard_normal(n) * np.exp(-tt / seconds * 6.5)
    ir = fft_filter(ir, lo=150, hi=6000); ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return y

wetL = reverb(RL, seed=1); wetR = reverb(RR, seed=2)
mixL = L + wetL * 0.9; mixR = R + wetR * 0.9

# gentle high-pass on the master to remove DC / rumble below 25 Hz
mixL = fft_filter(mixL, lo=25); mixR = fft_filter(mixR, lo=25)

# end fade (picture holds on the end card; sound breathes out)
fade = np.clip((DUR - t) / 2.5, 0, 1) ** 1.5
mixL *= fade; mixR *= fade

mix = np.stack([mixL, mixR], 1)
mix /= np.max(np.abs(mix))
mix = np.tanh(mix * 1.3) / np.tanh(1.3)  # gentle saturation / glue
mix *= 0.89 * 10 ** (-2.6 / 20)          # ≈ -14 LUFS integrated (web / social standard)
out = os.path.join(os.path.dirname(__file__), "..", "public", "audio", "ngcx_score.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", os.path.normpath(out), f"{DUR}s")
