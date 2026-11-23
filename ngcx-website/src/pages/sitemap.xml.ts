import type { APIRoute } from 'astro';
import { SITE_URL } from '../config';
import { pages, LANGS, type PageKey } from '../i18n/routes';

const keys: PageKey[] = ['home', 'pricing', 'check', 'imprint', 'privacy', 'terms'];
const abs = (p: string) => SITE_URL + (p === '/' ? '/' : p);

export const GET: APIRoute = () => {
  const urls = keys.flatMap((k) => {
    const langs = LANGS.filter((l) => pages[k][l]);
    const alts =
      langs.length > 1
        ? langs.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${abs(pages[k][l]!)}"/>`).join('\n') +
          `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(pages[k].de!)}"/>`
        : '';
    return langs.map((l) => `  <url>\n    <loc>${abs(pages[k][l]!)}</loc>${alts ? '\n' + alts : ''}\n  </url>`);
  });
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
