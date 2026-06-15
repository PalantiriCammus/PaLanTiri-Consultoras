"use client";

import { useActionState, useState } from "react";
import { crearConsultora, type ResultadoAlta } from "./actions";

const input =
  "rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
      className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
    >
      {ok ? "¡Copiado!" : "Copiar"}
    </button>
  );
}

function Codigo({ children }: { children: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg bg-slate-900 px-3 py-2">
      <pre className="flex-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[12px] text-emerald-300">
        {children}
      </pre>
      <Copiar texto={children} />
    </div>
  );
}

function Paso({
  n,
  titulo,
  children,
}: {
  n: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
        {n}
      </div>
      <div className="flex-1 pb-1">
        <p className="font-semibold text-slate-800">{titulo}</p>
        <div className="mt-1 space-y-1 text-sm text-slate-600">{children}</div>
      </div>
    </div>
  );
}

function GuiaPasos({ nombre, url }: { nombre: string; url: string }) {
  const host = url.replace("https://", "");
  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-5">
      <p className="mb-1 text-base font-bold text-emerald-700">
        ✅ Proyecto creado en Vercel
      </p>
      <p className="mb-4 text-sm text-slate-600">
        La app ya está desplegando en{" "}
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 underline">
          {host}
        </a>
        . Ahora seguí estos pasos para dejarla 100% operativa. Hacelos en orden.
      </p>

      <div className="space-y-5">
        <Paso n={1} titulo="Migrar la base de Supabase (la del cliente)">
          <p>
            En el proyecto Supabase de esta consultora → <b>SQL Editor → New query</b>. Pegá TODO el
            archivo <code className="rounded bg-slate-100 px-1">webapp/supabase/MIGRACIONES-BUNDLE.sql</code>{" "}
            (trae las 8 migraciones) y tocá <b>RUN</b>.
          </p>
          <p className="text-xs text-slate-400">✔️ Tiene que decir &quot;Success&quot;. Crea todas las tablas.</p>
        </Paso>

        <Paso n={2} titulo="Crear el usuario admin del cliente">
          <p>
            Supabase → <b>Authentication → Users → Add user → Create new user</b>:
          </p>
          <ul className="ml-4 list-disc text-xs text-slate-500">
            <li>Email del cliente (ej. <code className="rounded bg-slate-100 px-1">maria@empresa.com</code>)</li>
            <li>Una contraseña temporal</li>
            <li>✅ Tildá <b>Auto Confirm User</b></li>
          </ul>
          <p className="mt-1">Después, en <b>SQL Editor</b>, dale el rol admin (cambiá el email):</p>
          <Codigo>{`update public.profiles set rol = 'admin' where email = 'EMAIL_DEL_CLIENTE';`}</Codigo>
          <p className="text-xs text-slate-400">⚠️ Es <b>admin</b>, no super_admin (ese sos vos / Palantiri).</p>
        </Paso>

        <Paso n={3} titulo="Activar el CAPTCHA en Supabase">
          <p>
            Supabase → <b>Authentication → Attack Protection</b> → <b>Enable Captcha protection</b> →
            proveedor <b>Turnstile</b> → pegá la <b>Secret Key</b> de Cloudflare → <b>Save</b>.
          </p>
          <p className="text-xs text-slate-400">
            Es la Secret Key del widget Palantiri (la misma para todas las consultoras).
          </p>
        </Paso>

        <Paso n={4} titulo="Agregar el dominio al widget de Cloudflare">
          <p>
            <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
              dash.cloudflare.com
            </a>{" "}
            → <b>Turnstile</b> → widget <b>Palantiri</b> → <b>Settings → Hostnames → Add hostname</b>:
          </p>
          <Codigo>{host}</Codigo>
          <p className="text-xs text-slate-400">Sin esto, el captcha no carga y nadie puede entrar.</p>
        </Paso>

        <Paso n={5} titulo="Google: nada 🎉">
          <p>
            No hay que tocar Google Cloud (callback único). El cliente solo conecta su cuenta desde{" "}
            <b>Configuración → Integración con Google</b> dentro de la app.
          </p>
        </Paso>

        <Paso n={6} titulo="Verificar que quedó todo bien">
          <p>
            Abrí{" "}
            <a href={`${url}/api/health`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
              {host}/api/health
            </a>{" "}
            → tiene que decir <code className="rounded bg-slate-100 px-1">status: ok</code> y los 4
            servicios (db, email, captcha, google) en <b>true</b>.
          </p>
          <p>
            Después entrá al{" "}
            <a href={`${url}/login`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
              login
            </a>{" "}
            con el usuario admin y confirmá que el captcha te deja pasar.
          </p>
        </Paso>
      </div>

      <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        💡 La instancia ya quedó registrada abajo en esta Consola para monitorearla. Cuando los 4
        servicios estén verdes, está lista para entregar al cliente.
      </p>
    </div>
  );
}

export function CrearConsultoraForm() {
  const [estado, action, pending] = useActionState<ResultadoAlta | null, FormData>(
    crearConsultora,
    null,
  );

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-indigo-500">
        Crear consultora (automático) ⚡
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Crea el proyecto en Vercel, le carga las variables de entorno y dispara el deploy. La base
        Supabase la creás vos/el cliente en su cuenta; acá pegás sus 3 claves (Settings → API).
        Las claves compartidas (Google, Turnstile, Resend) se reutilizan de esta instancia.
      </p>

      <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Nombre del proyecto</span>
          <input name="nombre" required placeholder="confiarh-app" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">EMAIL_FROM (opcional)</span>
          <input name="emailFrom" placeholder="Consultora X <onboarding@resend.dev>" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Supabase Project URL</span>
          <input name="supabaseUrl" required placeholder="https://xxxxx.supabase.co" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">anon / publishable key</span>
          <input name="anonKey" required placeholder="sb_publishable_…" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">service_role / secret key</span>
          <input name="serviceRoleKey" required placeholder="sb_secret_…" className={input} />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Creando en Vercel…" : "Crear consultora"}
          </button>
        </div>
      </form>

      {estado && !estado.ok && (
        <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <pre className="whitespace-pre-wrap font-sans">{estado.mensaje}</pre>
        </div>
      )}

      {estado && estado.ok && estado.nombre && estado.url && (
        <GuiaPasos nombre={estado.nombre} url={estado.url} />
      )}
    </section>
  );
}
