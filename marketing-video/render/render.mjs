/**
 * Renders the film frame-by-frame (deterministic) with Playwright and encodes it with FFmpeg.
 *
 *   node marketing-video/render/render.mjs --format 16x9            → out/ONE-launch-16x9.mp4
 *   node marketing-video/render/render.mjs --format 9x16            → out/ONE-launch-9x16.mp4
 *   node marketing-video/render/render.mjs --stills 2,9,16          → out/stills/*.jpg (quick review)
 *   options: --fps 30  --from 0 --to 60  --scale 1 (0.5 = fast draft)
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const FORMAT = arg("format", "16x9");
const FPS = +arg("fps", 30);
const FROM = +arg("from", 0), TO = +arg("to", 60);
const SCALE = +arg("scale", 1);
const STILLS = arg("stills", null);
const W = FORMAT === "9x16" ? 1080 : 1920, H = FORMAT === "9x16" ? 1920 : 1080;

// tiny static server (fonts + images load reliably over http)
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".wav": "audio/wav", ".json": "application/json" };
const server = createServer(async (req, res) => {
  try { const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0])); res.writeHead(200, { "content-type": MIME[path.extname(p)] ?? "application/octet-stream" }); res.end(await readFile(p)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--disable-lcd-text", "--font-render-hinting=none"] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
page.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
page.on("console", (m) => m.type() === "error" && console.error("console:", m.text()));
await page.goto(`http://localhost:${port}/film/index.html?render=1&format=${FORMAT}`);
await page.evaluate(() => window.filmReady);

if (STILLS) {
  const dir = path.join(ROOT, "out", "stills"); await mkdir(dir, { recursive: true });
  for (const t of STILLS.split(",").map(Number)) {
    await page.evaluate((t) => window.seek(t), t);
    await page.screenshot({ path: path.join(dir, `${FORMAT}-${t.toFixed(2)}.jpg`), type: "jpeg", quality: 85 });
    console.log("still", t);
  }
  await browser.close(); server.close(); process.exit(0);
}

await mkdir(path.join(ROOT, "out"), { recursive: true });
const out = arg("out", path.join(ROOT, "out", `ONE-launch-${FORMAT}${existsSync(path.join(ROOT, "audio", "soundtrack.wav")) ? "" : "-silent"}.mp4`));
const audio = path.join(ROOT, "audio", "soundtrack.wav");
const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
  ...(existsSync(audio) ? ["-ss", String(FROM), "-i", audio] : []),
  "-vf", `scale=${W}:${H}:flags=lanczos,format=yuv420p`,
  "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high", "-tune", "film", "-movflags", "+faststart",
  ...(existsSync(audio) ? ["-c:a", "aac", "-b:a", "256k", "-shortest"] : []),
  out,
], { stdio: ["pipe", "inherit", "inherit"] });

const total = Math.round((TO - FROM) * FPS);
const t0 = Date.now();
for (let f = 0; f < total; f++) {
  const t = FROM + f / FPS;
  await page.evaluate((t) => window.seek(t), t);
  const buf = await page.screenshot({ type: "jpeg", quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % 60 === 0) console.log(`frame ${f}/${total}  t=${t.toFixed(2)}s  ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close(); server.close();
console.log("✓", out);
