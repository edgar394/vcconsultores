// Publica el sitio en la VPS compartida. Uso:
//
//   SITE_URL=https://vcconsultores.eliancorporativo.tech DEPLOY_HOST=deploy@app.eliancorporativo.tech npm run publish
//   SITE_URL=https://vcconsultores.com.mx               DEPLOY_HOST=deploy@app.eliancorporativo.tech npm run publish
//
// Con el dominio real, el build corre el chequeo de contenido y se niega si falta algo.
// Con cualquier otro dominio es VISTA PREVIA: construye aunque falten datos, con noindex y
// robots.txt que bloquea todo, para que el despacho revise sin que Google lo vea.
//
// Sube dist/ como una versión nueva en ~/vcconsultores/web/releases/<fecha>, la apunta como
// current/ y recrea el contenedor. Volver atrás: `npm run publish -- --rollback`.
// Ver docs/runbook-publicar.md.
//
// Necesita `ssh` y `tar` y un acceso SSH que ya funcione sin contraseña: el script nunca
// pide ni guarda credenciales.

import { execSync } from 'node:child_process';

const DOMINIO_REAL = 'https://vcconsultores.com.mx';
const REMOTE_DIR = '~/vcconsultores/web';
const KEEP_RELEASES = 5;

const { DEPLOY_HOST } = process.env;
const SITE_URL = process.env.SITE_URL?.replace(/\/$/, '');
const rollback = process.argv.includes('--rollback');

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function run(command, options = {}) {
  console.log(`\n$ ${command}`);
  return execSync(command, { stdio: 'inherit', ...options });
}

function remote(script) {
  // `set -e`: si un paso falla en el servidor, no se sigue con el siguiente.
  return run(`ssh ${DEPLOY_HOST} "set -e; ${script.replace(/"/g, '\\"')}"`);
}

if (!DEPLOY_HOST) fail('Falta DEPLOY_HOST (p. ej. deploy@app.eliancorporativo.tech).');

if (rollback) {
  // Apunta current/ a la penúltima versión. No reconstruye nada.
  remote(
    `cd ${REMOTE_DIR}; prev=$(ls -1 releases | sort | tail -n 2 | head -n 1); ` +
      `test -n "$prev" || { echo 'No hay versión anterior'; exit 1; }; ` +
      `ln -sfn releases/$prev current.tmp && mv -Tf current.tmp current; ` +
      `docker compose up -d --force-recreate; echo "current -> $prev"`,
  );
  process.exit(0);
}

if (!SITE_URL?.startsWith('https://')) {
  fail('Falta SITE_URL con https:// : sin ella no hay canonical, sitemap ni vista previa al compartir.');
}

const vistaPrevia = SITE_URL !== DOMINIO_REAL;
const env = { ...process.env, SITE_URL, VISTA_PREVIA: vistaPrevia ? '1' : '0' };
console.log(vistaPrevia ? `\nVISTA PREVIA en ${SITE_URL} (noindex, sin chequeo de contenido)` : `\nPRODUCCIÓN en ${SITE_URL}`);
run(vistaPrevia ? 'npm run build:draft' : 'npm run build', { env });

const release = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');

// tar por la tubería de ssh: no depende de rsync.
run(
  `tar -czf - -C dist . | ssh ${DEPLOY_HOST} "set -e; mkdir -p ${REMOTE_DIR}/releases/${release}; tar -xzf - -C ${REMOTE_DIR}/releases/${release}"`,
);

// current es un enlace simbólico; el contenedor se recrea porque un bind mount resuelve el
// enlace al montarse y seguiría sirviendo la versión anterior.
remote(
  `cd ${REMOTE_DIR}; ln -sfn releases/${release} current.tmp && mv -Tf current.tmp current; ` +
    `docker compose up -d --force-recreate; ` +
    `ls -1 releases | sort | head -n -${KEEP_RELEASES} | xargs -r -I{} rm -rf releases/{}`,
);

// Verificación real: que responda, no que el contenedor esté Up.
run(`curl -fsS -o /dev/null -w "HTTP %{http_code}\\n" ${SITE_URL}/`);
console.log(`\n✓ Publicado ${release} en ${SITE_URL}\n  Volver atrás: npm run publish -- --rollback\n`);
