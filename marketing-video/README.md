# ONE — Launch Film

A 60-second product film for **ONE – Your Personal Life Operating System**, built from the real app.

| File | Format | Use |
| --- | --- | --- |
| `out/ONE-launch-16x9.mp4` | 1920×1080, 30 fps, H.264 + AAC, −14 LUFS | Website, LinkedIn, YouTube |
| `out/ONE-launch-9x16.mp4` | 1080×1920, 30 fps, H.264 + AAC, −14 LUFS | Instagram Reels, TikTok, Shorts |

Nothing in this folder is imported by the app, so the product is unaffected.

## Creative concept: "From noise to ONE"

The film follows one real thread from start to finish: a **car insurance renewal letter** with a cancellation deadline. It starts as one more piece of clutter, then ONE stores it, reads it and turns it into a finished task. That makes the three pillars something you watch happen, not just slogans on screen.

| Time | Scene | What happens | On-screen text |
| --- | --- | --- | --- |
| 0–7 s | **The problem** | 24 information fragments (mails, invoices, reminders, chats) drift in 3D with depth of field. Notification badges keep popping up and the motion gets more restless. | *Your life is full of information. / But where does it all go?* |
| 7–14 s | **Meet ONE** | The fragments spiral into a single point of light. A light burst and shockwave follow. The ONE mark builds itself (the ring draws, the orbit dot settles into place). The ring then opens like an iris into the product. | *Meet ONE. / Your Personal Life Operating System.* |
| 14–23 s | **01 Remember** | The real dashboard appears in a browser frame. The real composer types into **Remember**, then shows *Saved to Memory.* Memory cards float out of the app: the document upload with text extraction, an idea, a note, and a search for "insurance". | *Everything important. One place.* |
| 23–32 s | **02 Understand** | The letter is scanned. Its key facts are highlighted and fly out as chips. The *Summary* and *Tasks & deadlines* cards appear. Animated lines link the letter to its *Related* items. | *Not just stored. Understood.* |
| 32–43 s | **03 Act** | A pipeline runs DOCUMENT → UNDERSTAND → TASK → ACTION → COMPLETED. A cursor clicks *Add 1 to Life*, then *Create an action from this*. The steps of the cancellation plan get ticked off while the draft letter types itself. The user confirms with *I've sent / completed this*, and confetti marks completion. | *From information to action.* |
| 43–53 s | **The ONE experience** | A 3D carousel through the real screens: Home, Memory, Action, Life and Intelligence, each with a slow push-in on a detail. The screens then fan out together. | *One system. More clarity. Less chaos.* |
| 53–60 s | **Brand moment** | The fan flies back into the light. The full ONE logo builds, followed by the claim and the CTA, with a shine sweep. | *ONE · Your Personal Life Operating System · Remember everything. Understand your life. Get things done. · Discover ONE* |

**Visual language:** the app's own design tokens (`src/app/globals.css`), the Geist typeface, the original lucide icons, and the real ONE logo geometry (`components/brand/logo.tsx`). The look is white and sky blue with soft aurora light, layered shadows and real 3D depth.

## Honesty rules

- Every feature shown exists in the current app: Memory (notes, uploads with text extraction, tags, search), Summary, *Find tasks & deadlines* → *Add to Life*, Related items, Action plans with steps and a draft, the status flow, *I've sent / completed this*, Life, Intelligence insights, and Ask ONE with sources.
- The film reflects the product principle **"ONE never sends anything on its own."** The user clicks every final step. ONE prepares, the user decides.
- All app screenshots come from a real local ONE instance. `capture/seed.mjs` filled it with a fictional persona ("Mara Lindqvist") **by clicking through the real UI**.
- Two cosmetic changes were made for the film. Both are disclosed here:
  1. The local *"AI demo mode"* developer hints are hidden in the screenshots. Those hints disappear anyway once an AI key is configured.
  2. The demo-mode task detection is rule-based, so it took whole sentences from the letter as task titles. Those titles were renamed to the short, imperative form the AI mode produces (for example "Cancel Nordlicht car insurance").
- The recreated UI cards in the film (composer, memory cards, task rows, action plan) copy the real components 1:1: same texts, colours, radii and icons.

## Music and sound

`audio/compose.py` synthesises the **entire score and every sound effect from scratch** with numpy. No samples or third-party audio are used, so there are no licensing questions.

- **Score in D major, 120 BPM.** It opens with a tense drone, heartbeat and clock ticks. It is sucked into an impact with a bright Dmaj9 bloom when the logo appears. The groove then builds in three steps (one per pillar), and the lead motif enters with ACT. The harmonic rhythm doubles during the montage, and the film ends on a final impact that resolves to Dmaj9.
- **Sound design:** notification pings, whooshes on transitions, key ticks while typing, UI clicks, an upload pop, a scan sweep, highlight swishes, connection blips, checkmark ticks, a completion chord, and shimmer on the CTA.
- **Sync:** every effect is triggered from `film/timeline.js`, the same file that drives the visuals.
- **Mastering:** linear normalisation to −14 LUFS (streaming standard) with a true-peak limiter, so the dynamic arc stays intact.

## Pipeline

```
capture/seed.mjs      drives the real ONE app (Playwright) and creates demo data through the UI
capture/capture.mjs   real screenshots at 2× (desktop) and 3× (mobile) → assets/screens/
capture/icons.mjs     renders the lucide icons used by ONE to SVG → film/icons.js
film/timeline.js      timing: scenes, key moments, sound cues (shared by video and audio)
film/index.html       the film: HTML/CSS/SVG/Canvas; every frame is a pure function of time
film/film.js          all 7 scenes, the motion system, the cursor choreography, both formats
audio/compose.py      original score and sound design → audio/soundtrack_raw.wav
audio/master.sh       loudness mastering → audio/soundtrack.wav
render/render.mjs     deterministic frame-by-frame render (Playwright) → FFmpeg (H.264 + AAC)
```

### Re-render

```bash
# optional: new screenshots (local ONE running on :3000 with the demo account)
node marketing-video/capture/seed.mjs
INSURANCE_URL=… ACTION_URL=… node marketing-video/capture/capture.mjs

# audio
node -e "const TL=require('./marketing-video/film/timeline.js');require('fs').writeFileSync('marketing-video/audio/cues.json',JSON.stringify({duration:TL.DURATION,K:TL.K,cues:TL.cues()},null,1))"
python3 marketing-video/audio/compose.py && marketing-video/audio/master.sh

# video
node marketing-video/render/render.mjs --format 16x9
node marketing-video/render/render.mjs --format 9x16
node marketing-video/render/render.mjs --stills 9.6,20,40.5     # quick review frames
```

**Live preview with sound:** serve the folder (`npx serve marketing-video`) and open `film/index.html?play=1`. Add `&format=9x16` for portrait, `&from=32` to start at a given second, or use `?t=25.3` for a single frame.

Requirements: Node 20+ with Playwright (already a devDependency of ONE), FFmpeg, and Python 3 with numpy.
