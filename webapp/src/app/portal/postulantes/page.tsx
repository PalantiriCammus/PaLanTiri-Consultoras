import { getSelectorActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function PortalPostulantesPage() {
  const selector = await getSelectorActual();
  if (!selector) return null;

  const supabase = await createClient();
  const { data: postulantes } = await supabase
    .from("postulantes")
    .select(
      "id, nombre, apellido, email, telefono, titulo_principal, estados_postulante(nombre, color), postulaciones(estado, perfiles_busqueda(titulo_puesto, empresas(nombre)))"
    )
    .eq("selector_id", selector.id)
    .order("fecha_carga", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Mis postulantes</h1>
      <p className="mt-1 text-slate-500">Candidatos que cargaste o tenés asignados.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Contacto</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Título</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Postulaciones</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(postulantes ?? []).map((p) => {
              const estado = p.estados_postulante as unknown as { nombre: string; color: string } | null;
              const postulaciones = (p.postulaciones ?? []) as unknown as {
                estado: string;
                perfiles_busqueda: { titulo_puesto: string; empresas: { nombre: string } | null } | null;
              }[];

              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {p.nombre} {p.apellido}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{p.email}</p>
                    <p className="text-xs text-slate-400">{p.telefono}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.titulo_principal}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {postulaciones.map((post, i) => (
                      <p key={i}>
                        {post.perfiles_busqueda?.titulo_puesto} ({post.perfiles_busqueda?.empresas?.nombre}) —{" "}
                        <span className="capitalize">{post.estado.replace("_", " ")}</span>
                      </p>
                    ))}
                  </td>
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
            {(postulantes ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Todavía no cargaste postulantes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
