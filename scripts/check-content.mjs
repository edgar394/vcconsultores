// Se corre antes de `astro build`. Si el contenido tiene huecos que harían el
// sitio inútil o engañoso (sin forma de contacto, servicios que el despacho no
// ha aprobado), el build se detiene en vez de publicar. `npm run build:draft`
// construye igual, para revisar el diseño mientras llegan los datos.

import { readFile } from 'node:fs/promises';

const firma = JSON.parse(await readFile(new URL('../src/data/firma.json', import.meta.url), 'utf8'));
const blockers = [];
const suggestions = [];
const { contacto } = firma;

if (!contacto.telefono && !contacto.whatsapp) {
  blockers.push('Falta contacto.telefono o contacto.whatsapp: sin ellos la única forma de contacto es un correo.');
}
if (!contacto.whatsapp) suggestions.push('Sin contacto.whatsapp no se muestra el botón de WhatsApp, que suele ser el canal que más convierte.');
if (!contacto.horario) suggestions.push('Falta contacto.horario.');

if (!firma.serviciosRevisados) {
  blockers.push('serviciosRevisados es false: los servicios y preguntas son una propuesta y el despacho no los ha aprobado.');
}

const pendientes = JSON.stringify(firma).match(/PENDIENTE[^"]*/g) ?? [];
for (const p of pendientes) blockers.push(`Texto por completar: "${p}"`);

if (contacto.emails.some((e) => e.endsWith('@gmail.com'))) {
  suggestions.push('El correo es @gmail.com; uno con el dominio (contacto@vcconsultores.com.mx) da más confianza.');
}
if (firma.alianzas.length && !firma.alianzasConfirmadas) {
  suggestions.push('Las alianzas no se muestran hasta poner alianzasConfirmadas en true (confirmar que siguen vigentes, sobre todo el logo del Gobierno de Chiapas).');
}
if (!firma.equipo.length) suggestions.push('La sección de equipo está oculta porque equipo está vacío.');
if (!process.env.SITE_URL) {
  suggestions.push('Sin SITE_URL: el build no lleva canonical ni URLs absolutas. Usa SITE_URL=https://vcconsultores.com.mx');
}

for (const s of suggestions) console.warn(`  · ${s}`);

if (blockers.length) {
  console.error('\nEl contenido no está listo para publicarse (src/data/firma.json):\n');
  for (const b of blockers) console.error(`  ✗ ${b}`);
  console.error('\nPara construir un borrador de todos modos: npm run build:draft\n');
  process.exit(1);
}
console.log('Contenido listo para publicarse.');
