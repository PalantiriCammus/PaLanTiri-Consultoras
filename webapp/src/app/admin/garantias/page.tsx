import { createClient } from "@/lib/supabase/server";
import { actualizarGarantia } from "./actions";

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

export default async function GarantiasPage() {
  const supabase = await createClient();
  const { data: garantias } = await supabase
    .from("seguimiento_garantia")
    .select(
      "id, dias_garantia, fecha_inicio, fecha_vencimiento, estado, fecha_fin_real, motivo_incumplimiento, notas, postulaciones(postulantes(nombre, apellido), perfiles_busqueda(titulo_puesto, empresas(nombre)))"
    )
    .order("fecha_vencimiento", { ascending: true });

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Garantías</h1>
        <p className="mt-1 text-slate-500">Seguimiento del período de garantía de las contrataciones.</p>
      </div>

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
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Acciones</th>
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
              const vencePronto = g.estado === "vigente" && g.fecha_vencimiento && g.fecha_vencimiento <= hoy;

              return (
                <tr key={g.id} className={`hover:bg-slate-50 ${vencePronto ? "bg-rose-50/50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {postulante?.nombre} {postulante?.apellido}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{perfil?.titulo_puesto}</td>
                  <td className="px-4 py-3 text-slate-600">{perfil?.empresas?.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{g.fecha_inicio}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {g.fecha_vencimiento}
                    {vencePronto && <span className="ml-2 text-xs font-semibold text-rose-600">¡Vencida!</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_COLOR[g.estado] ?? ""}`}>
                      {ESTADO_LABEL[g.estado] ?? g.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <details>
                      <summary className="cursor-pointer text-xs font-medium text-indigo-600">Gestionar</summary>
                      <form action={actualizarGarantia} className="mt-3 flex flex-col gap-2">
                        <input type="hidden" name="id" value={g.id} />
                        <select
                          name="estado"
                          defaultValue={g.estado}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="vigente">Vigente</option>
                          <option value="completada">Completada</option>
                          <option value="incumplida">Incumplida</option>
                          <option value="anulada">Anulada</option>
                        </select>
                        <select
                          name="motivo_incumplimiento"
                          defaultValue={g.motivo_incumplimiento ?? ""}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="">Sin motivo</option>
                          <option value="empresa_despidio">Empresa despidió</option>
                          <option value="postulante_renuncio">Postulante renunció</option>
                          <option value="acuerdo">Acuerdo</option>
                          <option value="otro">Otro</option>
                        </select>
                        <input
                          type="date"
                          name="fecha_fin_real"
                          defaultValue={g.fecha_fin_real ?? ""}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                        <textarea
                          name="notas"
                          defaultValue={g.notas}
                          rows={2}
                          placeholder="Notas"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-indigo-700"
                        >
                          Guardar
                        </button>
                      </form>
                    </details>
                  </td>
                </tr>
              );
            })}
            {(garantias ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Todavía no hay garantías en seguimiento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
