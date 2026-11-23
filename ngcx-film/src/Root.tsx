import React from "react";
import { Composition, Still } from "remotion";
import { Film } from "./Film";
import { Thumbnail } from "./Thumbnail";
import { DURATION, FPS } from "./timeline";

export const Root: React.FC = () => (
  <>
    <Composition id="NGCX-Film-16x9" component={Film} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} defaultProps={{ withAudio: true }} />
    <Composition id="NGCX-Film-9x16" component={Film} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={{ withAudio: true }} />
    <Still id="NGCX-Thumbnail" component={Thumbnail} width={1920} height={1080} />
    <Still id="NGCX-Thumbnail-9x16" component={Thumbnail} width={1080} height={1920} />
  </>
);
