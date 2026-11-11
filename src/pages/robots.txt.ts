import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  // La vista previa no se indexa: el contenido aún no está aprobado y competiría con el dominio real.
  if (process.env.VISTA_PREVIA === '1') return new Response('User-agent: *\nDisallow: /\n');
  return new Response(`User-agent: *\nAllow: /\n${site ? `Sitemap: ${new URL('/sitemap.xml', site).href}\n` : ''}`);
};
