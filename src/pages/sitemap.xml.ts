import type { APIRoute } from 'astro';
import { firma } from '../data/firma';

export const GET: APIRoute = ({ site }) => {
  const rutas = ['/', ...firma.areas.map((a) => `/${a.slug}/`), '/aviso-de-privacidad/'];
  const base = site ?? new URL('http://localhost');
  const urls = rutas.map((r) => `  <url><loc>${new URL(r, base).href}</loc></url>`).join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
