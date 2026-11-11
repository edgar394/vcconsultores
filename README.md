# VC Consultores — sitio web

Sitio estático (Astro) del despacho contable y jurídico VC Consultores, Tuxtla Gutiérrez, Chiapas.
Reemplaza el WordPress de https://vcconsultores.com.mx.

## Uso

```sh
npm install
npm run dev                 # http://localhost:4321
npm run build:draft         # construye aunque falten datos (para revisar diseño)
SITE_URL=https://vcconsultores.com.mx npm run build   # build de producción
```

## Contenido

Todo el texto y los datos de contacto viven en `src/data/firma.json`.
`npm run build` corre `scripts/check-content.mjs` y **se detiene** si falta algo que haría
el sitio inútil o engañoso:

- teléfono o WhatsApp,
- `serviciosRevisados: true` (los servicios son una propuesta hasta que el despacho los apruebe),
- textos marcados `PENDIENTE`.

Secciones que se ocultan solas mientras no haya datos: equipo (`equipo`), alianzas
(`alianzasConfirmadas`), horario, botón de WhatsApp.

El aviso de privacidad (`src/pages/aviso-de-privacidad.astro`) es una plantilla: el despacho
debe revisarlo antes de publicar.

## Publicación

Pendiente: se servirá desde la VPS compartida con Caddy (repo `vps-infra`), igual que el
sitio del Hotel Santo Domingo.
