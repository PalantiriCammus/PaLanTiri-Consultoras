import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConsultora } from "@/lib/consultora";
import { BusquedaForm } from "../busqueda-form";
import { AsignacionesPanel } from "../asignaciones-panel";
import { FlyerGenerador } from "../flyer-generador";

export default async function EditarBusquedaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: busqueda } = await supabase
    .from("perfiles_busqueda")
    .select("*")
    .eq("id", id)
    .single();

  if (!busqueda) notFound();

  const consultora = await getConsultora();

  const bullets = (busqueda.requisitos_excluyentes || busqueda.requisitos_deseables || "")
    .split("\n")
    .map((s: string) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Editar búsqueda</h1>
        <p className="mt-1 text-slate-500">{busqueda.titulo_puesto}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <BusquedaForm busqueda={busqueda} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-indigo-500">
          Generar flyer de la búsqueda
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          Diseñá el flyer (1080×1080) con los datos de la búsqueda. Podés descargarlo o guardarlo en la búsqueda.
        </p>
        <FlyerGenerador
          busquedaId={busqueda.id}
          puestoInicial={busqueda.titulo_puesto ?? ""}
          bulletsIniciales={bullets}
          ubicacionInicial={busqueda.ubicacion_puesto ?? ""}
          jornadaInicial={busqueda.jornada_laboral ?? ""}
          marcaInicial={consultora.nombre ?? ""}
        />
      </section>

      <AsignacionesPanel perfilBusquedaId={busqueda.id} />
    </div>
  );
}
