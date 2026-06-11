import { EmpresaForm } from "../empresa-form";

export default function NuevaEmpresaPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Nueva empresa</h1>
      <p className="mt-1 text-slate-500">Cargá los datos de la empresa cliente.</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmpresaForm />
      </div>
    </div>
  );
}
