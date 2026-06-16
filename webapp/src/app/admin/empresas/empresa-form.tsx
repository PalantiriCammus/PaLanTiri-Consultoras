import { createClient } from "@/lib/supabase/server";
import { RUBROS } from "@/lib/rubros";
import { guardarEmpresa } from "./actions";

type Empresa = {
  id?: number;
  nombre?: string;
  razon_social?: string | null;
  tipo_empresa?: string;
  rubro_id?: number | null;
  email_principal?: string;
  email_alterno?: string | null;
  telefono?: string;
  website?: string | null;
  pais?: string;
  provincia?: string;
  ciudad?: string;
  direccion?: string;
  codigo_postal?: string | null;
  contacto_nombre?: string;
  contacto_email?: string;
  contacto_telefono?: string;
  contacto_puesto?: string;
  contacto_comercial_nombre?: string | null;
  contacto_comercial_cargo?: string | null;
  contacto_comercial_telefono?: string | null;
  contacto_comercial_email?: string | null;
  modalidad_contratacion?: string;
  garantia?: string;
  comision_porcentaje?: number;
  salario_promedio_ofrecido?: number | null;
  activa?: boolean;
};

function Campo({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

export async function EmpresaForm({ empresa }: { empresa?: Empresa }) {
  const supabase = await createClient();
  const { data: rubros } = await supabase.from("rubros").select("id, nombre").order("nombre");

  // Opciones del combobox: catálogo del código + los que ya existan en la base.
  const nombresDb = (rubros ?? []).map((r) => r.nombre);
  const opcionesRubro = Array.from(new Set([...RUBROS, ...nombresDb])).sort((a, b) =>
    a.localeCompare(b),
  );
  const rubroActual = (rubros ?? []).find((r) => r.id === empresa?.rubro_id)?.nombre ?? "";

  return (
    <form action={guardarEmpresa} className="space-y-8">
      {empresa?.id && <input type="hidden" name="id" value={empresa.id} />}

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Datos generales
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="nombre" defaultValue={empresa?.nombre} required />
          <Campo label="Razón social" name="razon_social" defaultValue={empresa?.razon_social} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Tipo de empresa</span>
            <select
              name="tipo_empresa"
              defaultValue={empresa?.tipo_empresa ?? "privada"}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="privada">Privada</option>
              <option value="publica">Pública</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Rubro / Sector</span>
            <input
              name="rubro_nombre"
              defaultValue={rubroActual}
              list="lista-rubros"
              placeholder="Elegí o escribí el rubro…"
              autoComplete="off"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <datalist id="lista-rubros">
              {opcionesRubro.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>
          <Campo label="Sitio web" name="website" defaultValue={empresa?.website} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Contacto principal
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            label="Email principal"
            name="email_principal"
            type="email"
            defaultValue={empresa?.email_principal}
            required
          />
          <Campo label="Email alterno" name="email_alterno" type="email" defaultValue={empresa?.email_alterno} />
          <Campo label="Teléfono" name="telefono" defaultValue={empresa?.telefono} />
          <Campo label="Nombre de contacto" name="contacto_nombre" defaultValue={empresa?.contacto_nombre} />
          <Campo label="Email de contacto" name="contacto_email" type="email" defaultValue={empresa?.contacto_email} />
          <Campo label="Teléfono de contacto" name="contacto_telefono" defaultValue={empresa?.contacto_telefono} />
          <Campo label="Puesto del contacto" name="contacto_puesto" defaultValue={empresa?.contacto_puesto} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Ubicación
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label="País" name="pais" defaultValue={empresa?.pais ?? "Argentina"} />
          <Campo label="Provincia" name="provincia" defaultValue={empresa?.provincia} />
          <Campo label="Ciudad" name="ciudad" defaultValue={empresa?.ciudad} />
          <div className="sm:col-span-2">
            <Campo label="Dirección" name="direccion" defaultValue={empresa?.direccion} />
          </div>
          <Campo label="Código postal" name="codigo_postal" defaultValue={empresa?.codigo_postal} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Contacto comercial
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre y apellido" name="contacto_comercial_nombre" defaultValue={empresa?.contacto_comercial_nombre} />
          <Campo label="Cargo" name="contacto_comercial_cargo" defaultValue={empresa?.contacto_comercial_cargo} />
          <Campo label="Teléfono" name="contacto_comercial_telefono" defaultValue={empresa?.contacto_comercial_telefono} />
          <Campo label="Email comercial" name="contacto_comercial_email" type="email" defaultValue={empresa?.contacto_comercial_email} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Condiciones comerciales
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Modalidad de contratación</span>
            <select
              name="modalidad_contratacion"
              defaultValue={empresa?.modalidad_contratacion ?? "a_riesgo"}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="a_riesgo">A riesgo</option>
              <option value="con_anticipo">Con anticipo</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Garantía</span>
            <select
              name="garantia"
              defaultValue={empresa?.garantia ?? "con_garantia"}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="con_garantia">Con garantía</option>
              <option value="sin_garantia">Sin garantía</option>
            </select>
          </label>
          <Campo
            label="Comisión (%)"
            name="comision_porcentaje"
            type="number"
            defaultValue={empresa?.comision_porcentaje ?? 20}
          />
          <Campo
            label="Salario promedio ofrecido ($)"
            name="salario_promedio_ofrecido"
            type="number"
            defaultValue={empresa?.salario_promedio_ofrecido}
          />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="activa"
            defaultChecked={empresa?.activa ?? true}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="font-medium text-slate-700">Empresa activa</span>
        </label>
      </section>

      <div className="flex gap-3 border-t border-slate-100 pt-6">
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Guardar empresa
        </button>
        <a
          href="/admin/empresas"
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
