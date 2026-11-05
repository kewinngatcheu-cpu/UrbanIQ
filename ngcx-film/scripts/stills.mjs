// Quality-control helper: bundle once, render many frames as PNG.
// usage: node scripts/stills.mjs <compositionId> <outDir> <frame> [frame...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const [id, outDir, ...frames] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = process.env.REMOTION_CHROME || null;
const composition = await selectComposition({ serveUrl, id, browserExecutable });
for (const fr of frames) {
  const output = path.join(outDir, `${id}_${String(fr).padStart(4, "0")}.png`);
  await renderStill({ composition, serveUrl, output, frame: Number(fr), browserExecutable, scale: 0.5 });
  console.log(output);
}
