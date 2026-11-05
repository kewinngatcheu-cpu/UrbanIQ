# NGCX Intelligence — Brand Film & Social Commercial

A rendered product commercial for **NGCX – New Business Intelligence**
(first focus: Pipeline & Opportunity Intelligence). It's built with React + Remotion,
and everything in it is generated from code: animation, UI mock-ups and the soundtrack.

| Deliverable | File | Spec |
|---|---|---|
| A — Premium Brand Film | `out/NGCX_Brand_Film_16x9_1080p.mp4` | 1920×1080, 30 fps, 55 s, H.264 + AAC 320k |
| B — Social Commercial | `out/NGCX_Social_9x16_1080x1920.mp4` | 1080×1920, 30 fps, 55 s, H.264 + AAC 320k |
| Thumbnail 16:9 | `out/NGCX_Thumbnail_1920x1080.png` | Poster for YouTube, LinkedIn and the website |
| Thumbnail 9:16 | `out/NGCX_Thumbnail_1080x1920.png` | Cover for Reels, TikTok and Shorts |
| Soundtrack | `public/audio/ngcx_score.wav` | 48 kHz stereo, about −14 LUFS, original |

## Commands

```bash
npm install
npm run studio          # interactive preview (Remotion Studio)
npm run audio           # re-synthesise the score from src/timeline.json
npm run render          # audio + both videos + thumbnail
```

In a container without Chrome, set `REMOTION_CHROME=/path/to/chrome-headless-shell`.
Use `node scripts/stills.mjs <CompositionId> <outDir> <frame…>` to render QC frames.

## Structure

```
src/
  brand.ts            colour tokens, typefaces, easing vocabulary
  timeline.json       single source of truth for scene timing and audio cues
  Film.tsx            scene sequencing (shared by both formats)
  components/         Logo (layered original artwork), NetworkField (3D data),
                      LightSweep, Headline, Backdrop/Grain/Vignette
  scenes/             S1Opening … S6Brand. Each scene lays itself out for 16:9 and for 9:16
  ui/                 NGCX product concept: data, primitives, 5 dashboards
scripts/
  extract_logo_layers.py   cuts the official logo into transparent layers
  generate_audio.py        original score and sound design (numpy synthesis)
  stills.mjs               batch QC still renderer
docs/CREATIVE_DIRECTION.md design system, storyboard, sound concept, QC log
```

## Logo integrity
The logo is **never redrawn**. `scripts/extract_logo_layers.py` converts the official
artwork (`public/ngcx-logo-original.jpg`) to straight-alpha layers: the silver N‑G‑C,
the blue X, INTELLIGENCE, and KNOW. DECIDE. GROW. Only reveal, light and glow are
animated. Geometry, proportions and colours stay the same as in the original.

## Product honesty
The repository had no NGCX product UI, so every product view is an **illustrative
concept visualisation**. It's labelled on screen as "Product concept · Illustrative data".
All companies are fictional. The scores are labelled as indicative prioritisation, not
predictions. The signals are labelled as potential demand, not guaranteed buying intent.
