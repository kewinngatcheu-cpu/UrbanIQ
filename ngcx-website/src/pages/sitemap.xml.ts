import type { APIRoute } from 'astro';
import { SITE_URL } from '../config';

const pages = ['/', '/pipeline-check', '/impressum', '/datenschutz', '/agb'];

export const GET: APIRoute = () => {
  const urls = pages
    .map((p) => `  <url><loc>${SITE_URL}${p === '/' ? '/' : p}</loc></url>`)
    .join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
