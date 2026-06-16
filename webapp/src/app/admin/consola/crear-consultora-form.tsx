"use client";

import { useActionState, useEffect, useState } from "react";
import { crearConsultora, type ResultadoAlta } from "./actions";
import { MIGRACIONES_BUNDLE } from "@/lib/migraciones-bundle";

const input =
  "rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function Copiar({ texto, label = "Copiar" }: { texto: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
      className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
    >
      {ok ? "¡Copiado! ✓" : label}
    </button>
  );
}

function Codigo({ children, alto = false }: { children: string; alto?: boolean }) {
  return (
    <div className="mt-2 rounded-lg bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-1.5">
        <span className="text-[11px] font-medium text-slate-400">
          {alto ? "MIGRACIONES-BUNDLE.sql" : "SQL / valor"}
        </span>
        <Copiar texto={children} label={alto ? "Copiar todo" : "Copiar"} />
      </div>
      <pre
        className={`overflow-auto whitespace-pre px-3 py-2 font-mono text-[12px] leading-relaxed text-emerald-300 ${
          alto ? "max-h-72" : "max-h-40 whitespace-pre-wrap break-all"
        }`}
      >
        {children}
      </pre>
    </div>
  );
}

function Modal({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">{titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium text-slate-500 hover:bg-slate-50"
          >
            Cerrar ✕
          </button>
        </div>
        <div className="space-y-3 text-sm text-slate-600">{children}</div>
      </div>
    </div>
  );
}

type Paso = { n: number; titulo: string; resumen: string; contenido: React.ReactNode };

function GuiaPasos({ nombre, url }: { nombre: string; url: string }) {
  const host = url.replace("https://", "");
  const [abierto, setAbierto] = useState<number | null>(null);

  const pasos: Paso[] = [
    {
      n: 1,
      titulo: "Migrar la base de Supabase",
      resumen: "Pegá el SQL completo en el SQL Editor de la base del cliente.",
      contenido: (
        <>
          <p>
            En el proyecto Supabase de <b>{nombre}</b> → <b>SQL Editor → New query</b>. Copiá TODO
            este SQL, pegalo y tocá <b>RUN</b>. Trae las 8 migraciones (tablas, RLS, etc.).
          </p>
          <Codigo alto>{MIGRACIONES_BUNDLE}</Codigo>
          <p className="text-xs text-slate-400">✔️ Tiene que decir &quot;Success&quot;.</p>
        </>
      ),
    },
    {
      n: 2,
      titulo: "Darte acceso a la base (invitar a Palantiri)",
      resumen: "El dueño de la base invita a palantiriautomat como Administrator de su organización Supabase.",
      contenido: (
        <>
          <p>
            Para que <b>Palantiri</b> pueda administrar la base del cliente (correr migraciones,
            hacer ajustes) <b>sin loguearse</b> como el cliente, el dueño de la base lo invita como miembro:
          </p>
          <ul className="ml-4 list-disc text-sm">
            <li>Supabase → <b>Organization settings → Team → Invite member</b></li>
            <li>Email: <code className="rounded bg-slate-100 px-1">palantiriautomat@gmail.com</code></li>
            <li>Rol: <b>Administrator</b> (o Owner si querés control total)</li>
          </ul>
          <p className="text-xs text-slate-400">
            Aceptás la invitación desde el mail de palantiriautomat. Así administrás la base desde el
            dashboard del cliente sin sus credenciales — es lo que permite correr migraciones nuevas.
          </p>
        </>
      ),
    },
    {
      n: 3,
      titulo: "Crear el usuario admin del cliente",
      resumen: "Alta del usuario en Authentication + asignarle el rol admin por SQL.",
      contenido: (
        <>
          <p>
            Supabase → <b>Authentication → Users → Add user → Create new user</b>:
          </p>
          <ul className="ml-4 list-disc text-sm">
            <li>
              Email del cliente (ej. <code className="rounded bg-slate-100 px-1">maria@empresa.com</code>)
            </li>
            <li>Una contraseña temporal (se la pasás vos)</li>
            <li>
              ✅ Tildá <b>Auto Confirm User</b> (si no, no puede entrar)
            </li>
          </ul>
          <p className="mt-2">
            Después, en <b>SQL Editor</b>, dale el rol admin (reemplazá el email):
          </p>
          <Codigo>{`update public.profiles set rol = 'admin' where email = 'EMAIL_DEL_CLIENTE';`}</Codigo>
          <p className="text-xs text-slate-400">
            ⚠️ Es <b>admin</b>, no super_admin (ese rol es tuyo / de Palantiri).
          </p>
        </>
      ),
    },
    {
      n: 4,
      titulo: "Tu acceso de super_admin (soporte)",
      resumen: "Creá tu usuario en esta base y dale rol super_admin para entrar de soporte.",
      contenido: (
        <>
          <p>
            Para poder entrar a esta consultora vos mismo (soporte, gestión de usuarios, ver la
            Consola), creá <b>tu</b> usuario en la base nueva: Supabase →{" "}
            <b>Authentication → Users → Add user → Create new user</b> con <b>tu</b> email y ✅{" "}
            <b>Auto Confirm User</b>.
          </p>
          <p>
            Después, en <b>SQL Editor</b>, date el rol super_admin (reemplazá por tu email):
          </p>
          <Codigo>{`update public.profiles set rol = 'super_admin' where email = 'TU_EMAIL';`}</Codigo>
          <p className="text-xs text-slate-400">
            💡 Aparte, para administrar la base desde el dashboard de Supabase (SQL, logs, backups),
            pedile al cliente que te invite como <b>Administrator</b> a su organización
            (Organization → Team → Invite).
          </p>
        </>
      ),
    },
    {
      n: 5,
      titulo: "Activar el CAPTCHA en Supabase",
      resumen: "Authentication → Attack Protection → pegar la Secret Key de Turnstile.",
      contenido: (
        <>
          <p>
            Supabase → <b>Authentication → Attack Protection</b>:
          </p>
          <ul className="ml-4 list-disc text-sm">
            <li>
              <b>Enable Captcha protection</b> → ON
            </li>
            <li>
              Provider: <b>Turnstile</b>
            </li>
            <li>
              <b>Captcha secret</b>: pegá la <b>Secret Key</b> del widget Palantiri de Cloudflare
            </li>
            <li>
              <b>Save</b>
            </li>
          </ul>
          <p className="text-xs text-slate-400">
            La Secret Key es la misma para todas las consultoras (widget único de Cloudflare).
          </p>
        </>
      ),
    },
    {
      n: 6,
      titulo: "Agregar el dominio al widget de Cloudflare",
      resumen: `Sumar ${host} a los hostnames del widget Turnstile.`,
      contenido: (
        <>
          <p>
            <a
              href="https://dash.cloudflare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline"
            >
              dash.cloudflare.com
            </a>{" "}
            → <b>Turnstile</b> → widget <b>Palantiri</b> → <b>Settings → Hostnames → Add hostname</b>.
            Pegá este dominio:
          </p>
          <Codigo>{host}</Codigo>
          <p className="text-xs text-slate-400">Sin esto, el captcha no carga y nadie puede entrar.</p>
        </>
      ),
    },
    {
      n: 7,
      titulo: "Google: nada 🎉",
      resumen: "No hay que tocar Google Cloud (callback único).",
      contenido: (
        <p>
          No hay que registrar nada en Google Cloud. Gracias al <b>callback único</b>, el cliente
          solo conecta su cuenta desde <b>Configuración → Integración con Google</b> dentro de la
          app, cuando quiera usar Calendar/Meet/Drive.
        </p>
      ),
    },
    {
      n: 8,
      titulo: "Verificar que quedó todo bien",
      resumen: "Chequear /api/health y entrar al login.",
      contenido: (
        <>
          <p>
            Abrí{" "}
            <a
              href={`${url}/api/health`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline"
            >
              {host}/api/health
            </a>{" "}
            → tiene que decir <code className="rounded bg-slate-100 px-1">status: ok</code> y los 4
            servicios (db, email, captcha, google) en <b>true</b>.
          </p>
          <p>
            Después entrá al{" "}
            <a
              href={`${url}/login`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline"
            >
              login
            </a>{" "}
            con el usuario admin y confirmá que el captcha te deja pasar.
          </p>
        </>
      ),
    },
  ];

  const pasoAbierto = pasos.find((p) => p.n === abierto);

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-5">
      <p className="mb-1 text-base font-bold text-emerald-700">✅ Proyecto creado en Vercel</p>
      <p className="mb-4 text-sm text-slate-600">
        La app ya está desplegando en{" "}
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 underline">
          {host}
        </a>
        . Tocá cada paso para abrir su instructivo (con el contenido listo para copiar). Hacelos en orden.
      </p>

      <div className="space-y-2">
        {pasos.map((p) => (
          <button
            key={p.n}
            type="button"
            onClick={() => setAbierto(p.n)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
              {p.n}
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-slate-800">{p.titulo}</span>
              <span className="block text-xs text-slate-500">{p.resumen}</span>
            </span>
            <span className="shrink-0 text-sm font-medium text-indigo-600">Abrir →</span>
          </button>
        ))}
      </div>

      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        💡 La instancia ya quedó registrada abajo en esta Consola. Cuando los 4 servicios estén
        verdes, está lista para entregar al cliente.
      </p>

      {pasoAbierto && (
        <Modal titulo={`Paso ${pasoAbierto.n}: ${pasoAbierto.titulo}`} onClose={() => setAbierto(null)}>
          {pasoAbierto.contenido}
        </Modal>
      )}
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
        Supabase la creás vos/el cliente en su cuenta; acá pegás sus 3 claves (Settings → API). Las
        claves compartidas (Google, Turnstile, Resend) se reutilizan de esta instancia.
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
