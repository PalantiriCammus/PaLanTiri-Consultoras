# Alta de una nueva consultora (instancia)

Checklist para desplegar la plataforma para un cliente nuevo de Palantiri.
Tiempo estimado: **30–45 minutos**. Modelo: 1 repo → N instancias (cada
consultora tiene su propio Supabase, su proyecto Vercel y su dominio; todas
se actualizan automáticamente con cada push a `main`).

---

## Resumen rápido (A / B / C)

```
PARTE A — Supabase (a mano, en la cuenta del cliente)
  [ ] El cliente crea su cuenta + proyecto en Supabase
  [ ] Organization → Team → Invite member: palantiriautomat@gmail.com como Administrator (acceso de soporte a la base, para correr migraciones sin loguearse como el cliente)
  [ ] SQL Editor → correr webapp/supabase/MIGRACIONES-BUNDLE.sql
  [ ] Crear admin del cliente (Auto Confirm) + SQL: rol = 'admin'
  [ ] Settings → API: copiar Project URL, anon key, service_role key
  [ ] Attack Protection: activar CAPTCHA + pegar Secret Key de Turnstile

PARTE B — Vercel (lo hace el SCRIPT ⚡)
  [ ] $env:VERCEL_TOKEN="..."   (token de vercel.com/account/tokens)
  [ ] Completar webapp/scripts/nueva-instancia.local.json (copiar el .example)
  [ ] node webapp/scripts/crear-instancia.mjs --dry-run   (revisar)
  [ ] node webapp/scripts/crear-instancia.mjs             (crea proyecto + env vars + deploy)

PARTE C — Cierre (a mano, rápido)
  [ ] Cloudflare Turnstile: agregar el hostname <nombre>.vercel.app al widget
  [ ] Google: NADA (callback único ya configurado) 🎉
  [ ] Consola Palantiri: registrar la instancia con su URL
  [ ] Respaldo automático (sección 9): agregar la instancia a los 2 workflows + crear su secret SUPABASE_DB_URL_<NOMBRE>
  [ ] Verificar https://<nombre>.vercel.app/api/health → status: ok
```

> El **token de Vercel** es una llave de acceso a tu cuenta para programas (la
> API). El script lo usa para crear el proyecto y cargar las variables en tu
> nombre. Es secreto (no se sube a git) y se regenera/borra en
> https://vercel.com/account/tokens sin afectar tu contraseña.

El detalle de cada parte está abajo.

---

## 1. Supabase (base de datos propia del cliente)

1. En [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
   - Nombre: `consultora-<cliente>` · Región: South America (São Paulo) · Guardar la contraseña de la DB.
2. **SQL Editor** → lo más rápido: pegar todo `webapp/supabase/MIGRACIONES-BUNDLE.sql`
   (trae las migraciones `0001` a `0011`). O una por una en orden.
3. **Acceso de soporte para Palantiri (importante):** que el dueño de la base invite a
   Palantiri como administrador → **Organization settings → Team → Invite member** →
   `palantiriautomat@gmail.com` como **Administrator**. Así Palantiri puede administrar la
   base y correr migraciones futuras **sin loguearse** como el cliente.
4. **Settings → API**: copiar `Project URL`, `anon` key y `service_role` key (se usan en el paso 2).
4. Crear el usuario **admin del cliente** (es `admin`, NO `super_admin` — el super_admin es Palantiri):
   **Authentication → Users → Add user → Create new user** (email + contraseña temporal,
   marcar *Auto Confirm User*). El UUID no hace falta copiarlo. Luego en SQL Editor:
   ```sql
   update public.profiles set rol = 'admin' where email = 'admin@cliente.com';
   ```
5. (Captcha — **paso obligatorio**) **Authentication → Attack protection → Enable CAPTCHA**:
   proveedor Turnstile + el *secret key* del paso 4 de Cloudflare. Las **3 piezas** del CAPTCHA
   tienen que estar puestas o nadie puede entrar: (1) secret key acá en Supabase, (2)
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` en Vercel, (3) el dominio del cliente agregado al widget de Cloudflare.

## 2. Vercel (la web del cliente)

> ⚡ **Atajo automatizado:** en vez de hacer esto a mano, podés correr
> `node webapp/scripts/crear-instancia.mjs` — crea el proyecto, carga las 9 env
> vars y dispara el deploy de una. Necesitás un token de Vercel
> (https://vercel.com/account/tokens) en `VERCEL_TOKEN` y completar
> `webapp/scripts/nueva-instancia.local.json` (copiá el `.example`). Ver detalle
> al final de este documento. El paso manual de abajo queda como alternativa.

1. [vercel.com](https://vercel.com) → **Add New → Project** → importar el repo
   `PaLanTiri-Consultoras` (el mismo de siempre).
   - **Root Directory: `webapp`** · Framework: Next.js.
2. **Environment Variables** (Production + Preview + Development):

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL del paso 1.3 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key del paso 1.3 |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key del paso 1.3 |
   | `NEXT_PUBLIC_SITE_URL` | `https://dominio-del-cliente.com` |
   | `RESEND_API_KEY` | API key de Resend del cliente (paso 3) |
   | `EMAIL_FROM` | `Consultora X <noreply@dominio-del-cliente.com>` |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | site key de Turnstile (paso 4) |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | los de Palantiri (paso 5) |

3. **Deploy**. Luego **Settings → Domains** → agregar el dominio del cliente y
   seguir las instrucciones de DNS (CNAME → `cname.vercel-dns.com`).

## 3. Resend (emails del cliente)

1. Crear cuenta en [resend.com](https://resend.com) (puede ser del cliente).
2. **Domains → Add Domain** con el dominio del cliente → cargar los registros
   DNS (SPF/DKIM) → Verify.
3. **API Keys → Create** → va a `RESEND_API_KEY` en Vercel.

## 4. Cloudflare Turnstile (captcha del login)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Turnstile → Add widget**.
2. Hostname: el dominio del cliente. Copiar **site key** (→ Vercel) y
   **secret key** (→ Supabase, paso 1.5).

## 5. Google Calendar/Meet

✅ **Ya NO hay que registrar nada en Google Cloud por cada consultora.** Gracias
al *callback único*, todas las instancias usan la misma URL de redirección
central (la de la instancia madre, ya registrada). El cliente solo tiene que:

1. Conectar SU cuenta de Google desde **Configuración → Integración con Google**
   dentro de su app.

> Detrás de escena: la instancia inicia el OAuth contra el callback central
> (`pa-lan-tiri-consultoras.vercel.app/api/google/callback`), que reenvía el
> código a la instancia de origen (firmado en el `state`). Si algún día cambia
> la URL de la madre, se ajusta la env var `GOOGLE_CALLBACK_URL`.

## 6. WhatsApp (worker local del cliente)

1. Copiar la carpeta `worker/` a la PC del cliente (necesita Python y Chrome).
2. Crear `worker/.env` con el Supabase **del cliente**:
   ```
   SUPABASE_URL=https://<proyecto-del-cliente>.supabase.co
   SUPABASE_SERVICE_KEY=<service_role key del cliente>
   ```
3. `pip install -r requirements.txt` y `python whatsapp_worker_supabase.py` →
   escanear el QR con el número de WhatsApp de la consultora.

## 7. Configuración inicial dentro de la app

1. Entrar con el usuario admin → **Configuración → Identidad de la
   consultora**: nombre, logo, teléfono, email, web.
2. Revisar plantillas de **Alertas automáticas**.
3. Conectar **Google** (paso 5.2).
4. Crear usuarios del equipo en **Usuarios** y cargar los primeros selectores.

## 8. Registrar en la consola madre

En **tu** instancia de Palantiri → **Consola Palantiri** → Registrar
consultora (nombre + `https://dominio-del-cliente.com`). Desde ahí monitoreás
estado, versión y servicios de la instancia.

## 9. Respaldo automático (anti-pausa + backup nocturno) — OBLIGATORIO

Toda instancia nueva debe sumarse a los dos workflows de GitHub Actions del repo
`PalantiriCammus/PaLanTiri-Consultoras` (carpeta `.github/workflows/`). Usá un
identificador corto sin espacios ni acentos como `<nombre>` (ej. `confiarh`, `suenos`).

**a) Ping anti-pausa** — `ping-instancias.yml` → agregar a `matrix.instancia`:
```yaml
- nombre: <nombre>
  url: https://<dominio-real-de-la-instancia>
```
(No necesita secret; usa la URL pública de `/api/health`.)

**b) Backup nocturno** — `backup-bases.yml` → agregar a `matrix.instancia`:
```yaml
- nombre: <nombre>
  secreto: SUPABASE_DB_URL_<NOMBRE_EN_MAYUSCULAS>
```

**c) Crear el secret con el connection string de la base:**
1. Supabase (de esa instancia) → botón **Connect** → pestaña **Direct / Connection string**.
2. Connection Method = **Session pooler** (NO "Direct connection": usa IPv6 y falla
   desde GitHub Actions). Type = **URI**.
3. Copiar el URI (`...pooler.supabase.com:5432/postgres`) y reemplazar
   `[YOUR-PASSWORD]` por la contraseña real de la base.
4. GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:
   nombre `SUPABASE_DB_URL_<NOMBRE>`, valor el URI completo.
5. (Una sola vez para todo) tiene que existir el secret `BACKUP_PASSPHRASE`.

**d) Probar:** Actions → "Backup nocturno de bases" → **Run workflow**. Debe quedar en
verde y dejar el artefacto `backup-<nombre>-...`. Si una base no tiene su secret, el
workflow la **omite con un aviso** (no falla).

> Restaurar un backup: `gpg -d backup-xxx.sql.gz.gpg | gunzip | psql "<connection-string-destino>"`

## Verificación final

- [ ] `https://dominio-del-cliente.com/api/health` responde `"status": "ok"`
- [ ] Login con captcha funciona y muestra el logo del cliente
- [ ] Crear un selector → llega el email de invitación
- [ ] Asignar una búsqueda → email + WhatsApp al selector
- [ ] Agendar entrevista con Meet → evento en el Calendar del cliente
- [ ] La instancia aparece "En línea" en la Consola Palantiri
