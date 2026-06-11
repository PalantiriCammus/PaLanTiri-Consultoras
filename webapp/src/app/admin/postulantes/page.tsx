import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { eliminarPostulante } from "./actions";

export default async function PostulantesPage() {
  const supabase = await createClient();
  const { data: postulantes } = await supabase
    .from("postulantes")
    .select(
      "id, nombre, apellido, email, telefono, titulo_principal, experiencia_anos, estados_postulante(nombre, color)"
    )
    .order("fecha_carga", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Postulantes</h1>
          <p className="mt-1 text-slate-500">Base de candidatos de la consultora.</p>
        </div>
        <Link
          href="/admin/postulantes/nuevo"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          + Nuevo postulante
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Teléfono</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Título</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Experiencia</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(postulantes ?? []).map((p) => {
              const estado = p.estados_postulante as unknown as { nombre: string; color: string } | null;
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {p.nombre} {p.apellido}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.email}</td>
                  <td className="px-4 py-3 text-slate-600">{p.telefono}</td>
                  <td className="px-4 py-3 text-slate-600">{p.titulo_principal}</td>
                  <td className="px-4 py-3 text-slate-600">{p.experiencia_anos} años</td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: estado?.color ?? "#8e8e93" }}
                    >
                      {estado?.nombre ?? "Sin estado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/postulantes/${p.id}`}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                      >
                        Editar
                      </Link>
                      <form action={eliminarPostulante}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(postulantes ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Todavía no hay postulantes cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
