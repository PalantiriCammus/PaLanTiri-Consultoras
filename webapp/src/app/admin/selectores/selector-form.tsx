import { createClient } from "@/lib/supabase/server";
import { SelectorMultiple } from "@/app/admin/busquedas/selector-multiple";
import { guardarSelector } from "./actions";

type Selector = {
  id?: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  especializacion?: string;
  experiencia_anos?: number;
  descripcion_perfil?: string;
  pais?: string;
  provincia?: string;
  ciudad?: string;
  estado?: string;
  cuit?: string;
  dni?: string | null;
  entidad_pago?: string;
  datos_cuenta?: string;
  cbu_cvu_alias?: string;
  usuario_billetera?: string;
  comision_porcentaje_defecto?: number;
  profile_id?: string | null;
};

type Usuario = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string;
};

function Campo({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  hint?: string;
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
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export async function SelectorForm({ selector, usuarios = [] }: { selector?: Selector; usuarios?: Usuario[] }) {
  const supabase = await createClient();
  const { data: gruposData } = await supabase
    .from("grupos_selector")
    .select("nombre")
    .order("nombre");
  const grupos = (gruposData ?? []).map((g) => g.nombre);

  let gruposActuales: string[] = [];
  if (selector?.id) {
    const { data: mg } = await supabase
      .from("selector_grupos")
      .select("grupos_selector(nombre)")
      .eq("selector_id", selector.id);
    gruposActuales = (mg ?? [])
      .map((r) => (r.grupos_selector as unknown as { nombre: string } | null)?.nombre)
      .filter((n): n is string => Boolean(n));
  }

  return (
    <form action={guardarSelector} className="space-y-8">
      {selector?.id && <input type="hidden" name="id" value={selector.id} />}

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Datos personales
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="nombre" defaultValue={selector?.nombre} required />
          <Campo label="Apellido" name="apellido" defaultValue={selector?.apellido} required />
          <Campo label="Email" name="email" type="email" defaultValue={selector?.email} required />
          <Campo label="Teléfono" name="telefono" defaultValue={selector?.telefono} />
          <Campo label="DNI" name="dni" defaultValue={selector?.dni} />
          <Campo
            label="CUIT"
            name="cuit"
            defaultValue={selector?.cuit}
            required
            hint="Para extranjeros, poner 99 antes del ID y 9 al final."
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Perfil profesional
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Especialización</span>
            <select
              name="especializacion"
              defaultValue={selector?.especializacion ?? "general"}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="it">IT</option>
              <option value="admin">Administración</option>
              <option value="ejecutivo">Ejecutivo</option>
              <option value="general">General</option>
            </select>
          </label>
          <Campo
            label="Experiencia (años)"
            name="experiencia_anos"
            type="number"
            defaultValue={selector?.experiencia_anos ?? 0}
          />
          <div className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Grupo de selectores <span className="font-normal text-slate-400">(elegí uno o varios, o escribí uno nuevo)</span>
            </span>
            <SelectorMultiple
              name="grupos"
              opciones={grupos}
              defaultValue={gruposActuales.join(", ")}
              placeholder="Agregar a un grupo…"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Descripción de perfil</span>
              <textarea
                name="descripcion_perfil"
                defaultValue={selector?.descripcion_perfil}
                rows={3}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Ubicación
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label="País" name="pais" defaultValue={selector?.pais ?? "Argentina"} />
          <Campo label="Provincia" name="provincia" defaultValue={selector?.provincia} />
          <Campo label="Ciudad" name="ciudad" defaultValue={selector?.ciudad} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Datos para el pago de comisión
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Entidad de pago" name="entidad_pago" defaultValue={selector?.entidad_pago} />
          <Campo label="Datos de cuenta" name="datos_cuenta" defaultValue={selector?.datos_cuenta} />
          <Campo label="CBU/CVU/ALIAS" name="cbu_cvu_alias" defaultValue={selector?.cbu_cvu_alias} />
          <Campo label="Usuario billetera virtual" name="usuario_billetera" defaultValue={selector?.usuario_billetera} />
          <Campo
            label="Comisión por defecto (%)"
            name="comision_porcentaje_defecto"
            type="number"
            defaultValue={selector?.comision_porcentaje_defecto ?? 50}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Estado</span>
            <select
              name="estado"
              defaultValue={selector?.estado ?? "activo"}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="pausado">Pausado</option>
              <option value="baja">Baja</option>
            </select>
          </label>
        </div>
      </section>

      {selector?.id && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Cuenta de acceso
          </h2>
          <label className="flex flex-col gap-1 text-sm sm:max-w-md">
            <span className="font-medium text-slate-700">Usuario vinculado</span>
            <select
              name="profile_id"
              defaultValue={selector?.profile_id ?? ""}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Sin vincular</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido} ({u.email})
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs text-slate-400">
            Vinculá este selector con la cuenta de usuario que usará para acceder al portal.
          </p>
        </section>
      )}

      <div className="flex gap-3 border-t border-slate-100 pt-6">
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Guardar selector
        </button>
        <a
          href="/admin/selectores"
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
