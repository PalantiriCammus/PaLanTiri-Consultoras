import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostulanteForm } from "../postulante-form";

export default async function EditarPostulantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: postulante } = await supabase
    .from("postulantes")
    .select("*")
    .eq("id", id)
    .single();

  if (!postulante) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Editar postulante</h1>
      <p className="mt-1 text-slate-500">
        {postulante.nombre} {postulante.apellido}
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <PostulanteForm postulante={postulante} />
      </div>
    </div>
  );
}
