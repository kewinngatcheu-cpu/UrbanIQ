// Builds a single self-contained HTML page for a Claude artifact.
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "artifact/dist");
mkdirSync(out, { recursive: true });

const shim = (f) => path.join(root, "artifact/shims", f);
const shims = {
  plugin: {
    name: "shims",
    setup(b) {
      b.onResolve({ filter: /^next\/image$/ }, () => ({ path: shim("next-image.tsx") }));
      b.onResolve({ filter: /^next\/link$/ }, () => ({ path: shim("next-link.tsx") }));
      b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: shim("next-navigation.ts") }));
      b.onResolve({ filter: /map\/map-explorer$/ }, () => ({ path: shim("map-stub.tsx") }));
    },
  },
};

const res = await build({
  entryPoints: [path.join(root, "artifact/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  jsx: "automatic",
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [shims.plugin],
  write: false,
  logLevel: "warning",
});
const js = res.outputFiles[0].text;

execSync(`npx @tailwindcss/cli -i artifact/styles.css -o artifact/dist/app.css --minify`, { cwd: root, stdio: "inherit" });
const css = readFileSync(path.join(out, "app.css"), "utf8");
const images = JSON.parse(readFileSync(path.join(out, "images.json"), "utf8"));

const html = `<title>Our Summer Escape 2027</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Manrope:wght@300;400;500;600;700&display=swap">
<style>${css}</style>
<div id="se-root"></div>
<script>window.__SE_IMAGES=${JSON.stringify(images).replace(/</g, "\\u003c")};</script>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>`;
writeFileSync(path.join(out, "summer-escape.html"), html);
console.log("bytes", html.length);
