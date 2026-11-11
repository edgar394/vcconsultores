import { defineConfig } from 'astro/config';

// El dominio se lee de SITE_URL (https://vcconsultores.com.mx en producción)
// para que canonical, sitemap y robots lleven URLs absolutas.
export default defineConfig({
  site: process.env.SITE_URL,
  output: 'static',
  build: { inlineStylesheets: 'always' },
});
