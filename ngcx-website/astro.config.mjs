// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ngcxintelligence.de',
  output: 'static',
  trailingSlash: 'never',
  build: {
    // Jede Seite als Ordner mit index.html (/pipeline-check/index.html) –
    // funktioniert auf Vercel, Cloudflare Pages und jedem anderen Static-Host
    format: 'directory',
    // CSS immer als Datei ausliefern (passt zur Content-Security-Policy)
    inlineStylesheets: 'never',
  },
  // Skripte nie inline einbetten (Content-Security-Policy: script-src 'self')
  vite: { build: { assetsInlineLimit: 0 } },
  // Scope-Klassen auch an Komponenten weitergeben (z. B. <Card class="…">)
  scopedStyleStrategy: 'class',
  devToolbar: { enabled: false },
});
