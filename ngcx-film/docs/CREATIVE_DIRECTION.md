# NGCX — Creative Direction

## 1. Logo analysis → visual identity
- **Canvas:** near-pure black (#000–#050609) with a faint blue cast.
- **Structure:** brushed metallic silver letterforms (light top, steel-grey bottom gradient). The letters are geometric, wide and cut at hard angles. The N carries a diagonal slash.
- **Intelligence:** the **X** shades from silver to electric blue. A point of light sits at its upper-right tip. It's the only coloured element in the logo.
- **Hierarchy:** wordmark → widely tracked INTELLIGENCE → small, quiet claim.

From this comes the film's rule: **Black is the canvas. Silver is the structure. Electric Blue is the intelligence.**
Blue never decorates. It always marks what matters: a signal, a selected opportunity, a key score, a transition, the X.

## 2. Design system
| Token | Value | Use |
|---|---|---|
| Deep Black | `#050609` | base canvas |
| Obsidian | `#080B12` | app windows, centre of the gradient |
| Graphite | `#111722` | cards, surfaces |
| Metallic Silver | `#DCE2EA` | secondary text, structure, data points |
| Ice White | `#F5F7FB` | headlines, primary text |
| Electric Blue | `#087BFF` | highlights, signals, key metrics |
| Deep Electric Blue | `#0649C7` | gradients, ambient glow |
| Cyan Blue | `#35B8FF` | light cores, pulses, the "now" |
| Muted Steel | `#738197` | labels, metadata |

- **Type:** Sora (display; geometric, it echoes the wordmark) and Inter (UI). Headlines are 70–96 px with negative tracking. Labels are uppercase with wide tracking, which echoes INTELLIGENCE.
- **Motion vocabulary:** `cubic-bezier(0.16,1,0.3,1)` for reveals (fast in, long calm settle). In-out easing for camera and morphs. There's no overshoot and no bounce. Words rise out of their own mask with a de-blur.
- **Light:** a hairline core of white fading to blue, with a soft volumetric halo. It's used for wipes, the logo reveal and pulses along data connections.
- **Texture:** 4.5 % animated film grain, a soft vignette and a radial obsidian gradient.

## 3. Moodboard (keywords)
Precision instruments · night-time satellite imagery · brushed aluminium under a single blue key light ·
quiet enterprise software (calm surfaces, generous space) · data as constellations, not as noise.
Avoided: neon, purple/green palettes, HUD/sci-fi clichés, gaming glow, aggressive trailer cuts.

## 4. Storyboard (as built, 30 fps)
| # | Time | Picture | Text | Sound |
|---|---|---|---|---|
| 1 | 0–6 s | Black. A blue hairline grows from the centre. A 3D constellation of company data unfolds around it while the camera pushes in. | "Your next opportunity is already out there." / "But are you **seeing** it?" | Low impact, sub drone, sparse Dm(add9) pad |
| 2 | 6–13 s | A dolly through floating information cards (profiles, job posts, news, funding, trade fairs). Blue signals flash briefly, then blur and drift away. | "Too much information." / "Not enough **intelligence.**" / "Missed opportunities." | Tension pad (Dm9), whoosh, riser starts |
| 3 | 13–19 s | The constellation morphs into an ordered three-layer lattice. Blue pulses run along the grid. A light wipe passes, a beam reveals N‑G‑C, then the X ignites. | NGCX INTELLIGENCE / "New Business **Intelligence.**" | Riser → impact plus tonal sparkle on the X |
| 4 | 19–35 s | The product window settles from 3D to flat. Five views follow one fictional opportunity: **Discovery** (selected row), **Signals** (sources and time), **Scoring** (four dimensions, indicative), **Briefing** (context and approach), **Pipeline** (card dragged from Qualified to Prioritized). | 01–05 captions plus one-line benefits | Pulse arpeggio, soft kick, UI ticks synced to every row, bar and click |
| 5 | 35–44 s | The diagram builds: Market Signals → Company Intelligence → Opportunity Discovery → Smart Prioritization → New Business Opportunities. Scattered particles converge and turn blue. | "Discover. Understand. Prioritize. **Grow.**" | Build (Gm9 → Bb → Csus), denser pulse, node blips, chimes |
| 6 | 44–55 s | Black. A light impulse crosses the frame, the beam reveals the logo, the X pulses and a specular sheen passes. INTELLIGENCE and the claim follow. | "Turn market signals into business opportunities." / "Discover NGCX." | Final impact → resolves to D major. End card is **static from ≈50.7 s** (over 4 s hold) |

The **9:16 version** isn't a crop. Every scene recomposes itself (`useLayout`):
- Headlines wrap within an 860 px measure.
- The product UI becomes a mobile-style panel with an icon tab bar and stacked cards.
- The pipeline runs as vertical lanes and the flow diagram runs top to bottom.
- Captions and the concept label move to the top and bottom.

## 5. Sound concept
The score and sound design are fully original, synthesised in `scripts/generate_audio.py`. There are no samples and no licensing questions.
- The key is D minor at 96 BPM. Tension moves to structure, then pulse, then build, and finally resolves to **D major** on the end card ("Grow").
- Layers: additive detuned pads, a sub drone, a soft pluck arpeggio, a sine kick, impacts (pitched boom, filtered noise, shimmer), noise risers, whooshes, UI ticks, FM chimes and a convolution reverb bus.
- Every cue is read from `src/timeline.json`, so sound stays frame-locked to picture.
- The master is about −14 LUFS integrated with peaks around −3.6 dBFS.
- **Voice-over:** not included. No licensed voice was available in the production environment. The suggested script below fits the timeline. Record it with a calm, low, international English voice.

> (0 s) Your next opportunity is already out there. But are you seeing it?
> (7 s) Most new business still runs on referrals, lists and luck — while the real signals get lost.
> (14 s) NGCX. New business intelligence.
> (20 s) Discover companies that fit. See what's changing — and where it comes from. Prioritize with clear criteria. Understand the why before you reach out. And keep every opportunity moving.
> (36 s) From market signals to real opportunities.
> (45 s) NGCX Intelligence. Know. Decide. Grow.

## 6. Product truthfulness
- Every UI view is a **concept visualisation**. It's labelled on screen: "Product concept · Illustrative data".
- All companies (Corvane Systems, Halvorsen Robotics, …) are fictional.
- Scores are shown as "indicative" with an on-screen disclaimer: "Not a prediction of deal outcome." There are no win probabilities.
- Signals carry a source and a time reference, plus the note: "Signals point to potential demand — they are not guaranteed buying intent."
- The pipeline stages (Discovered, Analyzing, Qualified, Prioritized, In Progress) come from the brief.

## 7. QC log
- Every scene was checked as stills in both formats; then the full renders were checked frame by frame on contact sheets.
- Fixed during QC:
  - A faint rectangle around the logo layers (JPEG black noise). Fixed with a black point of 13 and a 28 px edge feather.
  - Chaotic edges in the ordered lattice. Replaced with true lattice neighbours.
  - Scene 2 cards were too faint and were drawn over the headline. They're now larger and isolated in their own stacking layer.
  - Score pills stretched inside pipeline cards.
  - Portrait type was oversized and the portrait end card sat off-centre.
  - Headline 1 wrapped awkwardly in 16:9.
- Colour check: UI colours come only from the token table above. No off-brand hues.
