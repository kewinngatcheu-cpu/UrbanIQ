import { continueRender, delayRender, registerRoot } from "remotion";
import { Root } from "./Root";

// Make sure the brand typefaces are loaded before the first frame is captured.
if (typeof document !== "undefined") {
  const handle = delayRender("Loading fonts");
  Promise.all(
    ["400", "500", "600", "700"].flatMap((w) => [
      document.fonts.load(`${w} 40px "Inter Variable"`),
      document.fonts.load(`${w} 40px "Sora Variable"`),
    ])
  )
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
}

registerRoot(Root);
