"use client";

import { useActionState } from "react";
import { crearConsultora, type ResultadoAlta } from "./actions";

const input =
  "rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

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
        Supabase la crea el cliente en su cuenta; acá pegás sus 3 claves (Settings → API).
        Las claves compartidas (Google, Turnstile, Resend) se reutilizan de esta instancia.
      </p>

      <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Nombre del proyecto</span>
          <input name="nombre" required placeholder="confiarh-app" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">EMAIL_FROM</span>
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

      {estado && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            estado.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
          }`}
        >
          {estado.url && (
            <a
              href={estado.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              {estado.url}
            </a>
          )}
          <pre className="mt-1 whitespace-pre-wrap font-sans">{estado.mensaje}</pre>
        </div>
      )}
    </section>
  );
}
