import { getConsultora } from "@/lib/consultora";
import { BusquedaForm } from "../busqueda-form";
import { FlyerGenerador } from "../flyer-generador";

export default async function NuevaBusquedaPage() {
  const consultora = await getConsultora();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nueva búsqueda</h1>
        <p className="mt-1 text-slate-500">Cargá los datos de la búsqueda de personal.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <BusquedaForm />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-indigo-500">
          Generar flyer
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          Diseñá el flyer (1080×1080) y descargalo. Una vez guardada la búsqueda, también podés
          adjuntárselo desde su pantalla de edición.
        </p>
        <FlyerGenerador marcaInicial={consultora.nombre ?? ""} />
      </section>
    </div>
  );
}
