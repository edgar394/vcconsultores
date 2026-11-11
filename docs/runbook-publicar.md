# Runbook — Publicar el sitio de VC Consultores

**Estado:** 🟡 preparado, sin ejecutar. Nada está en la VPS todavía.

## Contexto

- Elian Corporativo le da **solo el hosting** al despacho. El dominio `vcconsultores.com.mx` y su
  zona DNS son del cliente: la zona vive en su hosting de **Akky** (nameservers
  `dns1..4.akkyhosting10.mx`), junto con el WordPress anterior (`170.10.162.144`).
- **Nosotros nunca tocamos su DNS.** Les pedimos los cambios y verificamos con `dig`.
- El sitio se sirve desde la VPS compartida (`194.163.45.197`) detrás de `edge_caddy`, igual que
  el del Hotel Santo Domingo. El procedimiento general está en la skill `agregar-sitio` de
  `vps-infra`; cada paso que toca la VPS necesita **confirmación del dueño**.

## Piezas

| Pieza | Dónde vive | Qué hace |
|---|---|---|
| `infra/web/compose.yml` | este repo → VPS `~/vcconsultores/web/` | Contenedor `vcconsultores_web` (nginx) en `elian_net`, sin puertos |
| `infra/web/nginx.conf` | este repo → VPS `~/vcconsultores/web/` | Caché, 404 propia y redirecciones de las URLs del WordPress |
| `~/vcconsultores/web/releases/<fecha>/` | VPS | Cada publicación; se guardan las últimas 5 |
| `~/vcconsultores/web/current` | VPS | Enlace a la versión publicada |
| `proxy/caddy/sitios/vcconsultores.caddy` | repo `vps-infra` | TLS y cabeceras. Vista previa activa; dominio real comentado |
| `scripts/publish.mjs` (`npm run publish`) | este repo | Build, subida, cambio de versión, verificación y rollback |

Probado en local (2026-11-11) con `nginx:1.27-alpine`: `nginx -t` limpio; `/acerca-de/`,
`/blog/`, `/2022/...`, `/category/...` → 301; `/wp-login.php` y rutas inexistentes → 404 con
`404.html`. `caddy validate` limpio con el bloque de producción descomentado.

## Fase 1 — Vista previa en `vcconsultores.eliancorporativo.tech`

Se publica aunque falten datos: el script detecta que no es el dominio real, usa
`build:draft` y marca todo `noindex` (meta, `robots.txt` y cabecera `X-Robots-Tag` en Caddy).

1. **DNS (lo hace el dueño):** registro `A` `vcconsultores` → `194.163.45.197` en la zona de
   `eliancorporativo.tech`. Ojo con la migración a Cloudflare en curso (ver `vps-infra/CLAUDE.md`):
   mientras la zona esté *pending* responde Hostinger, y Hostinger puede tener la edición
   bloqueada. Crear el registro en Cloudflare (nube gris) y, si Hostinger lo permite, también ahí.
   Comprobar: `dig +short vcconsultores.eliancorporativo.tech` → `194.163.45.197`.
2. **Carpeta y archivos en la VPS:**
   ```bash
   ssh deploy@app.eliancorporativo.tech 'mkdir -p ~/vcconsultores/web/releases'
   scp infra/web/compose.yml infra/web/nginx.conf deploy@app.eliancorporativo.tech:~/vcconsultores/web/
   ```
3. **Primera publicación** (levanta el contenedor). El `curl` final fallará hasta el paso 4,
   porque Caddy aún no conoce el dominio; es esperado:
   ```bash
   SITE_URL=https://vcconsultores.eliancorporativo.tech DEPLOY_HOST=deploy@app.eliancorporativo.tech npm run publish
   ssh deploy@app.eliancorporativo.tech 'docker exec edge_caddy wget -qO- -S http://vcconsultores_web:80/ 2>&1 | head -1'
   ```
4. **Caddy:** merge de la rama de `vps-infra` a `main`, push, y en la VPS:
   ```bash
   ssh deploy@app.eliancorporativo.tech 'cd ~/vps-infra && git pull --ff-only &&
     docker exec edge_caddy grep -c vcconsultores /etc/caddy/sitios/vcconsultores.caddy &&
     docker exec edge_caddy caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile &&
     docker exec edge_caddy caddy reload --adapter caddyfile --config /etc/caddy/Caddyfile'
   ```
5. **Verificar** el sitio nuevo y los que ya estaban:
   ```bash
   for d in vcconsultores.eliancorporativo.tech app.eliancorporativo.tech hotel-santo-domingo.eliancorporativo.tech eliancorporativo.tech; do
     printf "%s " $d; curl -s -o /dev/null -w "%{http_code}\n" https://$d; done
   curl -sI https://vcconsultores.eliancorporativo.tech | grep -i x-robots-tag
   ```

**Rollback de la fase 1:** quitar `sitios/vcconsultores.caddy` (o su bloque), push, pull y
`caddy reload`. El contenedor puede quedarse: sin bloque nadie le llega.

## Fase 2 — Dominio real `vcconsultores.com.mx`

**Requisitos antes de empezar:**
- `npm run check-content` pasa: teléfono/WhatsApp, servicios aprobados por el despacho
  (`serviciosRevisados: true`), sin textos `PENDIENTE`.
- El despacho aprobó la vista previa.
- Saber si usan buzones `@vcconsultores.com.mx` en Akky.

**Pasos:**

1. **Separar el correo (lo hace el cliente en el Editor de zona DNS del cPanel de Akky).** Hoy
   el MX apunta a `vcconsultores.com.mx` (la raíz) y `mail` es alias de la raíz. Si se cambia la
   raíz sin esto, el correo del dominio deja de llegar.
   - `mail` → registro **A** `170.10.162.144` (en lugar del alias).
   - **MX** → `mail.vcconsultores.com.mx`.
   - Esperar el TTL y comprobar: `dig +short MX vcconsultores.com.mx` → `mail.vcconsultores.com.mx.`
2. **Publicar el build de producción en la VPS** (con el contenido completo):
   ```bash
   SITE_URL=https://vcconsultores.com.mx DEPLOY_HOST=deploy@app.eliancorporativo.tech npm run publish
   ```
   Esto reemplaza la vista previa en el mismo contenedor (el subdominio mostrará el sitio de
   producción; se puede quitar su bloque después). El `curl` final apunta al dominio real y
   seguirá respondiendo el WordPress hasta el paso 4: es esperado.
3. **Caddy:** descomentar los bloques de `vcconsultores.com.mx` y `www` en `vps-infra`. **No** se
   recarga todavía: sin el DNS apuntando, el desafío ACME fallaría.
4. **Cambio de DNS (lo hace el cliente, mismo editor de zona):**
   - **Editar** el registro A existente de `vcconsultores.com.mx.` → `194.163.45.197`. En cPanel la
     raíz se escribe con el nombre completo y punto final, no `@`. No agregar un segundo A.
   - `www` no se toca: es alias de la raíz.
   - **No tocar nameservers, MX ni TXT.**
5. Cuando `dig +short vcconsultores.com.mx` devuelva `194.163.45.197`: pull y `caddy reload`
   en la VPS (como en la fase 1, paso 4) y verificar con `curl -I https://vcconsultores.com.mx`
   y `https://www.vcconsultores.com.mx` (debe redirigir).

**Rollback de la fase 2:** el cliente regresa el registro A de la raíz a `170.10.162.144`
(el WordPress sigue vivo en Akky mientras no cancelen ese plan).

## Advertencia para el cliente

Si cancelan su plan de hosting de Akky pierden **la zona DNS y el correo**, no solo el
WordPress. Antes de cancelarlo hay que mover la zona a otro proveedor y resolver el correo.
