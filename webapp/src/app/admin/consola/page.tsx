import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { agregarInstancia, eliminarInstancia } from "./actions";
import { CrearConsultoraForm } from "./crear-consultora-form";

type Salud = {
  status: string;
  consultora: string;
  version: string;
  servicios: { db: boolean; email: boolean; captcha: boolean; google: boolean };
  latencia_ms: number;
};

async function chequearInstancia(url: string): Promise<Salud | null> {
  try {
    const res = await fetch(`${url}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Salud;
  } catch {
    return null;
  }
}

function Servicio({ nombre, ok }: { nombre: string; ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
        ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
      }`}
    >
      {ok ? "✓" : "—"} {nombre}
    </span>
  );
}

export default async function ConsolaPage() {
  const profile = await getProfile();
  if (!profile || profile.rol !== "super_admin") redirect("/admin");

  const supabase = await createClient();
  const { data: instancias } = await supabase
    .from("instancias_consultoras")
    .select("id, nombre, url, notas, fecha_alta")
    .order("nombre");

  const saludes = await Promise.all(
    (instancias ?? []).map((i) => chequearInstancia(i.url))
  );

  const total = (instancias ?? []).length;
  const online = saludes.filter((s) => s?.status === "ok").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Consola Palantiri</h1>
        <p className="mt-1 text-slate-500">
          Monitoreo de todas las consultoras desplegadas.
          {total > 0 && (
            <span className="ml-2 font-medium text-slate-700">
              {online}/{total} en línea
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {(instancias ?? []).map((inst, idx) => {
          const salud = saludes[idx];
          const estado = salud
            ? salud.status === "ok"
              ? { label: "En línea", clase: "bg-emerald-100 text-emerald-700" }
              : { label: "Con errores", clase: "bg-rose-100 text-rose-700" }
            : { label: "Sin respuesta", clase: "bg-slate-200 text-slate-600" };

          return (
            <div key={inst.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{inst.nombre}</p>
                  <a
                    href={inst.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    {inst.url.replace("https://", "")}
                  </a>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${estado.clase}`}>
                  {estado.label}
                </span>
              </div>

              {salud && (
                <>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {salud.consultora && <span>🏷️ {salud.consultora}</span>}
                    <span>🔖 versión {salud.version}</span>
                    <span>⚡ {salud.latencia_ms} ms</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Servicio nombre="Base de datos" ok={salud.servicios.db} />
                    <Servicio nombre="Email" ok={salud.servicios.email} />
                    <Servicio nombre="Captcha" ok={salud.servicios.captcha} />
                    <Servicio nombre="Google" ok={salud.servicios.google} />
                  </div>
                </>
              )}

              {inst.notas && <p className="mt-3 text-xs text-slate-500">📝 {inst.notas}</p>}

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <a
                  href={`${inst.url}/admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                >
                  Abrir panel
                </a>
                <a
                  href={`${inst.url}/api/health`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Ver health
                </a>
                <form action={eliminarInstancia} className="ml-auto">
                  <input type="hidden" name="id" value={inst.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    Quitar
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        {total === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400 xl:col-span-2">
            Todavía no registraste ninguna consultora. Agregá la primera abajo
            (podés empezar por esta misma instancia).
          </div>
        )}
      </div>

      <CrearConsultoraForm />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Registrar consultora (solo monitoreo)
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          Esta consola solo <strong>monitorea</strong> instancias que ya están desplegadas: la URL es
          la dirección donde vive la app de esa consultora (su dominio de Vercel, ej.{" "}
          <code className="rounded bg-slate-100 px-1">https://consultora-x.vercel.app</code>). Para
          desplegar una consultora nueva, seguí la guía ALTA-CONSULTORA.md del repositorio y después
          registrala acá.
        </p>
        <form action={agregarInstancia} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Nombre</span>
            <input
              type="text"
              name="nombre"
              required
              placeholder="Consultora XYZ"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">URL</span>
            <input
              type="url"
              name="url"
              required
              placeholder="https://consultoraxyz.com"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Notas</span>
            <input
              type="text"
              name="notas"
              placeholder="Contacto, plan, etc."
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Agregar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
