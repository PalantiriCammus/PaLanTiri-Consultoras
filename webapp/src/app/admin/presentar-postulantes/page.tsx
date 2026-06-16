import { createClient } from "@/lib/supabase/server";
import { PresentarPostulantesForm } from "./presentar-postulantes-form";

export default async function PresentarPostulantesPage() {
  const supabase = await createClient();

  const [{ data: empresas }, { data: postulantes }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, nombre")
      .eq("activa", true)
      .order("nombre"),
    supabase
      .from("postulantes")
      .select(
        "id, nombre, apellido, email, cv_path, postulaciones(id, estado, perfiles_busqueda(titulo_puesto))"
      )
      .order("nombre"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Presentar Postulantes a Empresas</h1>
        <p className="mt-1 text-slate-500">Selecciona múltiples candidatos para presentarlos a empresas.</p>
      </div>

      <PresentarPostulantesForm
        empresas={(empresas ?? []) as unknown as Parameters<typeof PresentarPostulantesForm>[0]["empresas"]}
        postulantes={(postulantes ?? []) as unknown as Parameters<typeof PresentarPostulantesForm>[0]["postulantes"]}
      />
    </div>
  );
}
