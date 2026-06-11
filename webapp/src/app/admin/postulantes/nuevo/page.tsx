import { PostulanteForm } from "../postulante-form";

export default function NuevoPostulantePage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Nuevo postulante</h1>
      <p className="mt-1 text-slate-500">Cargá los datos del candidato.</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <PostulanteForm />
      </div>
    </div>
  );
}
