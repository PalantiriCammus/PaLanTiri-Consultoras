import { createClient } from "@/lib/supabase/server";
import { urlPublicaFlyer } from "@/lib/storage/flyer";
import { PUESTOS } from "@/lib/puestos";
import { guardarBusqueda } from "./actions";

type Busqueda = {
  id?: number;
  empresa_id?: number;
  titulo_puesto?: string;
  descripcion?: string;
  areas?: string;
  nivel?: string;
  experiencia_minima_anios?: number;
  educacion_minima?: string;
  nivel_estudio_minimo_id?: number | null;
  habilidades_requeridas?: string;
  es_remoto?: boolean;
  ubicacion_puesto?: string;
  salario_minimo?: number;
  salario_maximo?: number;
  beneficios?: string;
  jornada_laboral?: string | null;
  convenio?: string | null;
  cantidad_posiciones?: number;
  estado_id?: number | null;
  selector_asignado_id?: number | null;
  prioridad?: string;
  fecha_vencimiento?: string | null;
  fecha_inicio?: string | null;
  comision_porcentaje?: number | null;
  salario_estipulado_comision?: number | null;
  jd_url?: string | null;
  notas_internas?: string;
  // Job Description
  mision_puesto?: string | null;
  responsabilidades?: string | null;
  requisitos_excluyentes?: string | null;
  requisitos_deseables?: string | null;
  candidato_ideal?: string | null;
  observaciones?: string | null;
  descansos?: string | null;
  edad_rango?: string | null;
  zona_residencia?: string | null;
  flyer_imagen_path?: string | null;
};

const inputCls =
  "rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function Campo({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        className={inputCls}
      />
    </label>
  );
}

function Area({
  label,
  name,
  defaultValue,
  rows = 3,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm sm:col-span-2">
      <span className="font-medium text-slate-700">{label}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
      <textarea name={name} defaultValue={defaultValue ?? ""} rows={rows} className={inputCls} />
    </label>
  );
}

export async function BusquedaForm({ busqueda }: { busqueda?: Busqueda }) {
  const supabase = await createClient();

  const [{ data: empresas }, { data: estados }, { data: selectores }, { data: niveles }] =
    await Promise.all([
      supabase.from("empresas").select("id, nombre").eq("activa", true).order("nombre"),
      supabase.from("estados_busqueda").select("id, nombre").order("orden"),
      supabase.from("selectores").select("id, nombre, apellido").eq("estado", "activo").order("nombre"),
      supabase.from("niveles_estudio").select("id, nombre").order("peso"),
    ]);

  return (
    <form action={guardarBusqueda} className="space-y-6">
      {busqueda?.id && <input type="hidden" name="id" value={busqueda.id} />}

      {/* 1. Datos generales */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          1 · Datos generales
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Empresa</span>
            <select name="empresa_id" defaultValue={busqueda?.empresa_id ?? ""} required className={inputCls}>
              <option value="" disabled>Seleccionar empresa</option>
              {(empresas ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Título del puesto</span>
            <input
              name="titulo_puesto"
              defaultValue={busqueda?.titulo_puesto ?? ""}
              required
              list="lista-puestos"
              placeholder="Elegí de la lista o escribí uno nuevo"
              className={inputCls}
            />
            <datalist id="lista-puestos">
              {PUESTOS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <span className="text-xs text-slate-400">Hay una lista precargada; podés escribir cualquier otro.</span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Área</span>
            <select name="areas" defaultValue={busqueda?.areas ?? "otro"} className={inputCls}>
              <option value="it">IT</option>
              <option value="admin">Administración</option>
              <option value="ejecutivo">Ejecutivo</option>
              <option value="otro">Otro</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Nivel</span>
            <select name="nivel" defaultValue={busqueda?.nivel ?? "semi_senior"} className={inputCls}>
              <option value="senior">Senior</option>
              <option value="semi_senior">Semi Senior</option>
              <option value="junior">Junior</option>
              <option value="practicante">Practicante</option>
            </select>
          </label>

          <Area label="Descripción" name="descripcion" defaultValue={busqueda?.descripcion} />
        </div>
      </section>

      {/* 2. Requisitos */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          2 · Requisitos
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Experiencia mínima (años)" name="experiencia_minima_anios" type="number" defaultValue={busqueda?.experiencia_minima_anios ?? 0} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Nivel de estudio mínimo</span>
            <select name="nivel_estudio_minimo_id" defaultValue={busqueda?.nivel_estudio_minimo_id ?? ""} className={inputCls}>
              <option value="">Sin especificar</option>
              {(niveles ?? []).map((n) => (
                <option key={n.id} value={n.id}>{n.nombre}</option>
              ))}
            </select>
          </label>
          <Campo label="Educación mínima (texto libre)" name="educacion_minima" defaultValue={busqueda?.educacion_minima} placeholder="Ej: Lic. en Sistemas, Contador Público…" />
          <Campo label="Habilidades requeridas" name="habilidades_requeridas" defaultValue={busqueda?.habilidades_requeridas} placeholder="Separadas por coma: React, SQL, inglés…" />
          <Area label="Requisitos excluyentes" name="requisitos_excluyentes" defaultValue={busqueda?.requisitos_excluyentes} hint="Uno por línea" />
          <Area label="Requisitos deseables" name="requisitos_deseables" defaultValue={busqueda?.requisitos_deseables} hint="Uno por línea" />
        </div>
      </section>

      {/* 3. Condiciones */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          3 · Condiciones
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label="Ubicación del puesto" name="ubicacion_puesto" defaultValue={busqueda?.ubicacion_puesto} />
          <Campo label="Cantidad de posiciones" name="cantidad_posiciones" type="number" defaultValue={busqueda?.cantidad_posiciones ?? 1} />
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" name="es_remoto" defaultChecked={busqueda?.es_remoto ?? false} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="font-medium text-slate-700">Modalidad remota</span>
          </label>
          <Campo label="Salario mínimo" name="salario_minimo" type="number" defaultValue={busqueda?.salario_minimo ?? 0} />
          <Campo label="Salario máximo" name="salario_maximo" type="number" defaultValue={busqueda?.salario_maximo ?? 0} />
          <Campo label="Convenio" name="convenio" defaultValue={busqueda?.convenio} placeholder="Ej: SMATA, Fuera de convenio" />
          <Campo label="Jornada laboral" name="jornada_laboral" defaultValue={busqueda?.jornada_laboral} placeholder="Ej: Lun a Vie de 9 a 18 hs" />
          <Campo label="Descansos" name="descansos" defaultValue={busqueda?.descansos} />
          <Area label="Beneficios" name="beneficios" defaultValue={busqueda?.beneficios} hint="Obra social, bonos, etc." />
        </div>
      </section>

      {/* 4. Job Description (plegable) */}
      <details className="rounded-2xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-slate-400">
          4 · Descripción del puesto (Job Description) — opcional
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Area label="Misión del puesto" name="mision_puesto" defaultValue={busqueda?.mision_puesto} />
          <Area label="Responsabilidades" name="responsabilidades" defaultValue={busqueda?.responsabilidades} hint="Una por línea" rows={4} />
          <Area label="Candidato ideal" name="candidato_ideal" defaultValue={busqueda?.candidato_ideal} />
          <Area label="Observaciones" name="observaciones" defaultValue={busqueda?.observaciones} />
          <Campo label="Rango de edad sugerido" name="edad_rango" defaultValue={busqueda?.edad_rango} placeholder="Ej: 25 a 40" />
          <Campo label="Zona de residencia sugerida" name="zona_residencia" defaultValue={busqueda?.zona_residencia} />
        </div>
      </details>

      {/* 5. Flyer */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          5 · Flyer promocional
        </h2>
        <div className="flex flex-wrap items-start gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">
              {busqueda?.flyer_imagen_path ? "Reemplazar flyer" : "Imagen (PNG, JPG o WebP)"}
            </span>
            <input
              type="file"
              name="flyer"
              accept=".png,.jpg,.jpeg,.webp"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700"
            />
          </label>
          {busqueda?.flyer_imagen_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlPublicaFlyer(busqueda.flyer_imagen_path)}
              alt="Flyer actual de la búsqueda"
              className="max-h-40 rounded-xl border border-slate-200 object-contain"
            />
          )}
        </div>
      </section>

      {/* 6. Gestión y comercial */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          6 · Gestión y comercial
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Estado</span>
            <select name="estado_id" defaultValue={busqueda?.estado_id ?? ""} className={inputCls}>
              <option value="">Sin estado</option>
              {(estados ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Selector asignado</span>
            <select name="selector_asignado_id" defaultValue={busqueda?.selector_asignado_id ?? ""} className={inputCls}>
              <option value="">Sin asignar</option>
              {(selectores ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {`${s.nombre ?? ""} ${s.apellido ?? ""}`.trim() || `Selector #${s.id}`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Prioridad</span>
            <select name="prioridad" defaultValue={busqueda?.prioridad ?? "normal"} className={inputCls}>
              <option value="baja">Baja</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </label>
          <Campo label="Fecha de vencimiento" name="fecha_vencimiento" type="date" defaultValue={busqueda?.fecha_vencimiento} />
          <Campo label="Fecha estimada de inicio" name="fecha_inicio" type="date" defaultValue={busqueda?.fecha_inicio} />
          <Campo label="JD URL (Google Docs)" name="jd_url" defaultValue={busqueda?.jd_url} placeholder="https://docs.google.com/…" />
          <Campo label="Comisión específica (%)" name="comision_porcentaje" type="number" defaultValue={busqueda?.comision_porcentaje} placeholder="Sobreescribe la de la empresa" />
          <Campo label="Salario estipulado p/ comisión" name="salario_estipulado_comision" type="number" defaultValue={busqueda?.salario_estipulado_comision} />
          <Area label="Notas internas" name="notas_internas" defaultValue={busqueda?.notas_internas} />
        </div>
      </section>

      <div className="flex gap-3 border-t border-slate-100 pt-6">
        <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          Guardar búsqueda
        </button>
        <a href="/admin/busquedas" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
          Cancelar
        </a>
      </div>
    </form>
  );
}
