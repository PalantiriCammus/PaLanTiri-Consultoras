import { createClient } from "@/lib/supabase/server";

function Tarjeta({
  titulo,
  valor,
  icono,
  color,
}: {
  titulo: string;
  valor: number;
  icono: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-lg ${color}`}
      >
        {icono}
      </div>
      <p className="text-3xl font-bold text-slate-900">{valor}</p>
      <p className="mt-1 text-sm text-slate-500">{titulo}</p>
    </div>
  );
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };

  const en15Dias = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);

  const [
    empresas,
    busquedas,
    selectores,
    postulantes,
    postActivas,
    garantias,
    { data: garantiasPorVencer },
  ] = await Promise.all([
    supabase.from("empresas").select("*", head).eq("activa", true),
    supabase.from("perfiles_busqueda").select("*", head).is("fecha_cierre", null),
    supabase.from("selectores").select("*", head).eq("estado", "activo"),
    supabase.from("postulantes").select("*", head),
    supabase
      .from("postulaciones")
      .select("*", head)
      .in("estado", [
        "enviada",
        "recibida",
        "entrevista",
        "oferta",
        "aceptada_postulante",
      ]),
    supabase
      .from("seguimiento_garantia")
      .select("*", head)
      .eq("estado", "vigente"),
    supabase
      .from("seguimiento_garantia")
      .select(
        "id, fecha_vencimiento, postulaciones(postulantes(nombre, apellido), perfiles_busqueda(titulo_puesto, empresas(nombre)))"
      )
      .eq("estado", "vigente")
      .not("fecha_vencimiento", "is", null)
      .lte("fecha_vencimiento", en15Dias)
      .order("fecha_vencimiento"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-slate-500">
        Resumen general de la operación de la consultora.
      </p>

      {(garantiasPorVencer ?? []).length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-semibold text-amber-900">
            ⏳ Garantías que vencen en los próximos 15 días
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {(garantiasPorVencer ?? []).map((g) => {
              const post = g.postulaciones as unknown as {
                postulantes: { nombre: string; apellido: string } | null;
                perfiles_busqueda: {
                  titulo_puesto: string;
                  empresas: { nombre: string } | null;
                } | null;
              } | null;
              const dias = Math.max(
                0,
                Math.ceil(
                  (new Date(g.fecha_vencimiento!).getTime() - Date.now()) / 86400000
                )
              );
              return (
                <li key={g.id}>
                  <span className="font-medium">
                    {post?.postulantes?.nombre} {post?.postulantes?.apellido}
                  </span>{" "}
                  — {post?.perfiles_busqueda?.titulo_puesto}
                  {post?.perfiles_busqueda?.empresas &&
                    ` (${post.perfiles_busqueda.empresas.nombre})`}{" "}
                  · vence el {g.fecha_vencimiento}{" "}
                  {dias === 0 ? "(¡hoy!)" : `(en ${dias} día${dias === 1 ? "" : "s"})`}
                </li>
              );
            })}
          </ul>
          <a
            href="/admin/garantias"
            className="mt-3 inline-block text-sm font-semibold text-amber-900 underline"
          >
            Ir a Garantías →
          </a>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tarjeta
          titulo="Empresas activas"
          valor={empresas.count ?? 0}
          icono="🏢"
          color="bg-indigo-100"
        />
        <Tarjeta
          titulo="Búsquedas abiertas"
          valor={busquedas.count ?? 0}
          icono="🔍"
          color="bg-blue-100"
        />
        <Tarjeta
          titulo="Selectores activos"
          valor={selectores.count ?? 0}
          icono="🧑‍💼"
          color="bg-violet-100"
        />
        <Tarjeta
          titulo="Postulantes en base"
          valor={postulantes.count ?? 0}
          icono="👥"
          color="bg-emerald-100"
        />
        <Tarjeta
          titulo="Postulaciones en proceso"
          valor={postActivas.count ?? 0}
          icono="📋"
          color="bg-amber-100"
        />
        <Tarjeta
          titulo="Garantías vigentes"
          valor={garantias.count ?? 0}
          icono="🛡️"
          color="bg-rose-100"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-slate-500">
          ¿Querés ver el funnel de conversión, el ranking de selectores y las series mensuales?
        </p>
        <a
          href="/admin/kpis"
          className="mt-3 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          📈 Ver panel de KPIs
        </a>
      </div>
    </div>
  );
}
