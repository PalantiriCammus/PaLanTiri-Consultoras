import { getSelectorActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ESTADO_LABEL: Record<string, string> = {
  vigente: "Vigente",
  completada: "Completada",
  incumplida: "Incumplida",
  anulada: "Anulada",
};

const ESTADO_COLOR: Record<string, string> = {
  vigente: "bg-amber-100 text-amber-700",
  completada: "bg-emerald-100 text-emerald-700",
  incumplida: "bg-rose-100 text-rose-700",
  anulada: "bg-slate-100 text-slate-500",
};

export default async function PortalGarantiasPage() {
  const selector = await getSelectorActual();
  if (!selector) return null;

  const supabase = await createClient();
  const { data: garantias } = await supabase
    .from("seguimiento_garantia")
    .select(
      "id, fecha_inicio, fecha_vencimiento, estado, postulaciones!inner(selector_id, postulantes(nombre, apellido), perfiles_busqueda(titulo_puesto, empresas(nombre)))"
    )
    .eq("postulaciones.selector_id", selector.id)
    .order("fecha_vencimiento", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Garantías</h1>
      <p className="mt-1 text-slate-500">Estado de garantía de tus colocaciones.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Postulante</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Búsqueda</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Empresa</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Inicio</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Vence</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(garantias ?? []).map((g) => {
              const postulacion = g.postulaciones as unknown as {
                postulantes: { nombre: string; apellido: string } | null;
                perfiles_busqueda: { titulo_puesto: string; empresas: { nombre: string } | null } | null;
              } | null;
              const postulante = postulacion?.postulantes;
              const perfil = postulacion?.perfiles_busqueda;

              return (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {postulante?.nombre} {postulante?.apellido}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{perfil?.titulo_puesto}</td>
                  <td className="px-4 py-3 text-slate-600">{perfil?.empresas?.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{g.fecha_inicio}</td>
                  <td className="px-4 py-3 text-slate-600">{g.fecha_vencimiento}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_COLOR[g.estado] ?? ""}`}>
                      {ESTADO_LABEL[g.estado] ?? g.estado}
                    </span>
                  </td>
                </tr>
              );
            })}
            {(garantias ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Todavía no tenés garantías en seguimiento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
