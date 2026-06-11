import { getSelectorActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default async function PortalComisionesPage() {
  const selector = await getSelectorActual();
  if (!selector) return null;

  const supabase = await createClient();
  const { data: comisiones } = await supabase
    .from("comisiones")
    .select(
      "id, monto_selector, monto_sourcing, monto_cierre, fecha_calculo, fecha_pago, fecha_vencimiento_garantia, empresas(nombre), estados_comision(nombre, color)"
    )
    .or(`selector_id.eq.${selector.id},selector_sourcing_id.eq.${selector.id}`)
    .order("fecha_calculo", { ascending: false });

  const totalPendiente = (comisiones ?? [])
    .filter((c) => !c.fecha_pago)
    .reduce((acc, c) => acc + (c.monto_selector ?? 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Mis comisiones</h1>
      <p className="mt-1 text-slate-500">Comisiones generadas por tus colocaciones.</p>

      <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
        <span className="text-lg">💰</span>
        <span className="font-semibold">Pendiente de cobro: {fmt(totalPendiente)}</span>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Empresa</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Monto</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Calculada</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Pagada</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Vence garantía</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(comisiones ?? []).map((c) => {
              const empresa = c.empresas as unknown as { nombre: string } | null;
              const estado = c.estados_comision as unknown as { nombre: string; color: string } | null;
              const monto = (c.monto_sourcing ?? 0) + (c.monto_cierre ?? 0);

              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{empresa?.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{fmt(monto)}</td>
                  <td className="px-4 py-3 text-slate-600">{c.fecha_calculo?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-slate-600">{c.fecha_pago ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.fecha_vencimiento_garantia}</td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: estado?.color ?? "#8e8e93" }}
                    >
                      {estado?.nombre ?? "Sin estado"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {(comisiones ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Todavía no tenés comisiones generadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
