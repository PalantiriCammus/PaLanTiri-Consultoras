import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmpresaForm } from "../empresa-form";

export default async function EditarEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", id)
    .single();

  if (!empresa) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Editar empresa</h1>
      <p className="mt-1 text-slate-500">{empresa.nombre}</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmpresaForm empresa={empresa} />
      </div>
    </div>
  );
}
