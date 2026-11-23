import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Backdrop, Grain, Vignette } from "./components/Backdrop";
import { S1Opening } from "./scenes/S1Opening";
import { S2Problem } from "./scenes/S2Problem";
import { S3Intro } from "./scenes/S3Intro";
import { S4Product } from "./scenes/S4Product";
import { S5Flow } from "./scenes/S5Flow";
import { S6Brand } from "./scenes/S6Brand";
import { scene } from "./timeline";

const SCENES = [
  { k: "opening", C: S1Opening },
  { k: "problem", C: S2Problem },
  { k: "intro", C: S3Intro },
  { k: "product", C: S4Product },
  { k: "flow", C: S5Flow },
  { k: "brand", C: S6Brand },
] as const;

/** The full NGCX brand film. Format-aware: same story, recomposed for 16:9 and 9:16. */
export const Film: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => (
  <AbsoluteFill style={{ backgroundColor: "#050609" }}>
    <Backdrop />
    {SCENES.map(({ k, C }) => {
      const s = scene(k);
      return (
        <Sequence key={k} from={s.from} durationInFrames={s.duration} name={k}>
          <C dur={s.duration} />
        </Sequence>
      );
    })}
    <Vignette />
    <Grain opacity={0.045} />
    {withAudio && <Audio src={staticFile("audio/ngcx_score.wav")} />}
  </AbsoluteFill>
);
