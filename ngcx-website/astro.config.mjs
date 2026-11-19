// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ngcxintelligence.de',
  output: 'static',
  trailingSlash: 'never',
  build: {
    // /impressum.html wird auf Cloudflare Pages als /impressum ausgeliefert
    format: 'file',
    // CSS immer als Datei ausliefern (passt zur Content-Security-Policy)
    inlineStylesheets: 'never',
  },
  // Skripte nie inline einbetten (Content-Security-Policy: script-src 'self')
  vite: { build: { assetsInlineLimit: 0 } },
  // Scope-Klassen auch an Komponenten weitergeben (z. B. <Card class="…">)
  scopedStyleStrategy: 'class',
  devToolbar: { enabled: false },
});
