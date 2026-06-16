import { createClient } from "@/lib/supabase/server";
import { urlPublicaFlyer } from "@/lib/storage/flyer";
import { PUESTOS } from "@/lib/puestos";
import { guardarBusqueda } from "./actions";
import { SkillsIndex } from "./skills-index";
import { BeneficiosPerks } from "./beneficios-perks";
import { EducacionTitulos } from "./educacion-titulos";
import { SelectorMultiple } from "./selector-multiple";
import { IDIOMAS_COMUNES } from "@/lib/idiomas";

type Busqueda = {
  id?: number;
  empresa_id?: number;
  titulo_puesto?: string;
  descripcion?: string;
  areas?: string;
  nivel?: string;
  experiencia_minima_anios?: number;
  educacion_minima?: string;
  titulos_requeridos?: string;
  idiomas_requeridos?: string;
  habilidades_requeridas?: string;
  es_remoto?: boolean;
  ubicacion_puesto?: string;
  salario_minimo?: number;
  salario_maximo?: number;
  beneficios?: string;
  jornada_laboral?: string | null;
  convenio?: string | null;
  descansos?: string | null;
  cantidad_posiciones?: number;
  estado_id?: number | null;
  selector_asignado_id?: number | null;
  prioridad?: string;
  fecha_vencimiento?: string | null;
  fecha_inicio?: string | null;
  comision_porcentaje?: number | null;
  salario_estipulado_comision?: number | null;
  notas_internas?: string;
  mision_puesto?: string | null;
  responsabilidades?: string | null;
  requisitos_excluyentes?: string | null;
  requisitos_deseables?: string | null;
  candidato_ideal?: string | null;
  preguntas_informe?: string | null;
  observaciones?: string | null;
  edad_rango?: string | null;
  zona_residencia?: string | null;
  flyer_imagen_path?: string | null;
};

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const PROVINCIAS = [
  "CABA (Ciudad Autónoma de Buenos Aires)", "GBA Norte", "GBA Sur", "GBA Oeste",
  "Buenos Aires (Provincia)", "Rosario, Santa Fe", "Santa Fe (Provincia)",
  "Córdoba (Capital)", "Córdoba (Provincia)", "Mendoza", "Tucumán", "Entre Ríos",
  "Salta", "Neuquén", "Río Negro", "Chubut", "Santa Cruz", "Tierra del Fuego",
  "San Juan", "San Luis", "La Pampa", "Catamarca", "La Rioja", "Santiago del Estero",
  "Chaco", "Corrientes", "Misiones", "Formosa", "Jujuy",
];

const EDADES = Array.from({ length: 63 }, (_, i) => i + 18); // 18..80

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-sm font-medium text-slate-700">{children}</span>;
}

// Grupo de "pastillas" = radios nativos estilizados (sin JS).
function Segment({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
      {options.map((o) => (
        <span key={o.value}>
          <input
            type="radio"
            id={`${name}_${o.value}`}
            name={name}
            value={o.value}
            defaultChecked={defaultValue === o.value}
            className="peer sr-only"
          />
          <label
            htmlFor={`${name}_${o.value}`}
            className="block cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:shadow"
          >
            {o.label}
          </label>
        </span>
      ))}
    </div>
  );
}

export async function BusquedaForm({ busqueda }: { busqueda?: Busqueda }) {
  const supabase = await createClient();
  const [{ data: empresas }, { data: estados }, { data: selectores }] = await Promise.all([
    supabase.from("empresas").select("id, nombre").eq("activa", true).order("nombre"),
    supabase.from("estados_busqueda").select("id, nombre").order("orden"),
    supabase.from("selectores").select("id, nombre, apellido").eq("estado", "activo").order("nombre"),
  ]);

  const modalidadDefault = busqueda?.es_remoto ? "remoto" : "presencial";
  const expDefault = String(busqueda?.experiencia_minima_anios ?? 3);
  const posDefault = String(busqueda?.cantidad_posiciones ?? 1);

  return (
    <form action={guardarBusqueda} className="space-y-6">
      {busqueda?.id && <input type="hidden" name="id" value={busqueda.id} />}

      {/* 1 · Datos del puesto */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">1 · Datos del puesto</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            <Label>Empresa Cliente *</Label>
            <select name="empresa_id" defaultValue={busqueda?.empresa_id ?? ""} required className={inputCls}>
              <option value="" disabled>Seleccionar empresa</option>
              {(empresas ?? []).map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </label>
          <label>
            <Label>Título del Puesto *</Label>
            <input name="titulo_puesto" defaultValue={busqueda?.titulo_puesto ?? ""} required list="lista-puestos"
              placeholder="Seleccioná o escribí el puesto…" autoComplete="off" className={inputCls} />
            <datalist id="lista-puestos">{PUESTOS.map((p) => <option key={p} value={p} />)}</datalist>
          </label>
          <label>
            <Label>Jornada Laboral</Label>
            <input name="jornada_laboral" defaultValue={busqueda?.jornada_laboral ?? ""} placeholder="Ej: Lunes a Viernes de 9 a 18 hs" className={inputCls} />
          </label>
          <label>
            <Label>Convenio Colectivo</Label>
            <input name="convenio" defaultValue={busqueda?.convenio ?? ""} placeholder="Ej: SMATA, Fuera de convenio" className={inputCls} />
          </label>
          <label>
            <Label>Comisión Pactada (%)</Label>
            <input type="number" step="0.01" min="0" max="100" name="comision_porcentaje" defaultValue={busqueda?.comision_porcentaje ?? ""} placeholder="Ej: 20.00" className={inputCls} />
          </label>
          <label>
            <Label>Salario estipulado para comisión ($)</Label>
            <input type="number" min="0" name="salario_estipulado_comision" defaultValue={busqueda?.salario_estipulado_comision ?? ""} placeholder="Base para el cálculo" className={inputCls} />
          </label>
          <label>
            <Label>Fecha estimada de inicio</Label>
            <input type="date" name="fecha_inicio" defaultValue={busqueda?.fecha_inicio ?? ""} className={inputCls} />
          </label>
        </div>
      </section>

      {/* 2 · Clasificación */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">2 · Clasificación</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label>Área Profesional</Label>
            <Segment name="areas" defaultValue={busqueda?.areas ?? "it"} options={[
              { value: "it", label: "IT" }, { value: "admin", label: "Administrativo" },
              { value: "ejecutivo", label: "Ejecutivo" }, { value: "otro", label: "Otro" },
            ]} />
          </div>
          <div>
            <Label>Nivel del Puesto</Label>
            <Segment name="nivel" defaultValue={busqueda?.nivel ?? "semi_senior"} options={[
              { value: "practicante", label: "Trainee" }, { value: "junior", label: "Junior" },
              { value: "semi_senior", label: "Semi Sr" }, { value: "senior", label: "Senior" },
            ]} />
          </div>
          <div>
            <Label>Experiencia Mínima Requerida</Label>
            <Segment name="experiencia_minima_anios" defaultValue={expDefault} options={[
              { value: "0", label: "Sin exp" }, { value: "1", label: "1-2 años" },
              { value: "3", label: "3-4 años" }, { value: "5", label: "5+ años" },
            ]} />
          </div>
          <div>
            <Label>Prioridad de Cobertura</Label>
            <Segment name="prioridad" defaultValue={busqueda?.prioridad ?? "normal"} options={[
              { value: "baja", label: "Baja" }, { value: "normal", label: "Normal" },
              { value: "alta", label: "Alta" }, { value: "urgente", label: "Urgente" },
            ]} />
          </div>
          <div>
            <Label>Modalidad (Presencialidad)</Label>
            <Segment name="modalidad_trabajo" defaultValue={modalidadDefault} options={[
              { value: "presencial", label: "Presencial" }, { value: "remoto", label: "100% Remoto" },
              { value: "hibrido", label: "Híbrido" },
            ]} />
          </div>
          <div>
            <Label>Cantidad de Posiciones a Cubrir</Label>
            <Segment name="cantidad_posiciones" defaultValue={posDefault} options={[
              { value: "1", label: "1" }, { value: "2", label: "2" },
              { value: "3", label: "3" }, { value: "5", label: "5+" },
            ]} />
          </div>
        </div>
      </section>

      {/* 3 · Ubicación, edad y salario */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">3 · Ubicación y compensación</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            <Label>Ubicación del Puesto</Label>
            <input name="ubicacion_puesto" defaultValue={busqueda?.ubicacion_puesto ?? ""} placeholder="Ej: CABA, Argentina" className={inputCls} />
          </label>
          <div>
            <Label>Rango de Edad Recomendado</Label>
            <div className="flex items-center gap-2">
              <select name="edad_min" defaultValue="" className={inputCls}>
                <option value="">Mín</option>
                {EDADES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <span className="text-slate-400">a</span>
              <select name="edad_max" defaultValue="" className={inputCls}>
                <option value="">Máx</option>
                {EDADES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <span className="whitespace-nowrap text-sm text-slate-400">años</span>
            </div>
          </div>
          <label>
            <Label>Zona de Residencia sugerida</Label>
            <select name="zona_select" defaultValue={busqueda?.zona_residencia ?? ""} className={inputCls}>
              <option value="">-- Seleccionar --</option>
              {PROVINCIAS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label>
            <Label>…o escribí otra zona</Label>
            <input name="zona_text" placeholder="Zona personalizada (tiene prioridad)" className={inputCls} />
          </label>
          <label>
            <Label>Salario Mínimo Mensual ($)</Label>
            <input type="number" min="0" name="salario_minimo" defaultValue={busqueda?.salario_minimo ?? 0} className={inputCls} />
          </label>
          <label>
            <Label>Salario Máximo Mensual ($)</Label>
            <input type="number" min="0" name="salario_maximo" defaultValue={busqueda?.salario_maximo ?? 0} className={inputCls} />
          </label>
        </div>
      </section>

      {/* 4 · Descripción detallada del perfil */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-indigo-500">
          4 · Descripción detallada del perfil requerido
        </h2>
        <div className="grid grid-cols-1 gap-4">
          <label><Label>Misión u objetivo principal del puesto *</Label>
            <textarea name="mision_puesto" defaultValue={busqueda?.mision_puesto ?? ""} rows={2} required placeholder="Define brevemente el propósito del puesto…" className={inputCls} /></label>
          <label><Label>Descripción general o resumen corto</Label>
            <textarea name="descripcion" defaultValue={busqueda?.descripcion ?? ""} rows={2} placeholder="Resumen rápido o notas del cliente…" className={inputCls} /></label>
          <label><Label>Candidato ideal</Label>
            <textarea name="candidato_ideal" defaultValue={busqueda?.candidato_ideal ?? ""} rows={2} placeholder="Buscamos un profesional con…" className={inputCls} /></label>
          <label><Label>Preguntas filtro para el informe (una por línea)</Label>
            <textarea name="preguntas_informe" defaultValue={busqueda?.preguntas_informe ?? ""} rows={3} placeholder={"¿Tenés experiencia liquidando Ganancias?\n¿Tuviste equipo a cargo?"} className={inputCls} /></label>
          <label><Label>Responsabilidades y tareas clave (una por línea)</Label>
            <textarea name="responsabilidades" defaultValue={busqueda?.responsabilidades ?? ""} rows={3} className={inputCls} /></label>
          <label><Label>Requisitos excluyentes / indispensables (uno por línea)</Label>
            <textarea name="requisitos_excluyentes" defaultValue={busqueda?.requisitos_excluyentes ?? ""} rows={3} className={inputCls} /></label>
          <label><Label>Requisitos deseables / valorados (uno por línea)</Label>
            <textarea name="requisitos_deseables" defaultValue={busqueda?.requisitos_deseables ?? ""} rows={3} className={inputCls} /></label>
          <EducacionTitulos
            defaultEducacion={busqueda?.educacion_minima ?? ""}
            defaultTitulos={busqueda?.titulos_requeridos ?? ""}
          />
          <div><Label>Idiomas requeridos <span className="font-normal text-slate-400">(elegí uno o varios)</span></Label>
            <SelectorMultiple name="idiomas_requeridos" opciones={IDIOMAS_COMUNES} defaultValue={busqueda?.idiomas_requeridos ?? ""} placeholder="Agregar idioma…" /></div>
          <label><Label>Horarios de descansos / breaks</Label>
            <input name="descansos" defaultValue={busqueda?.descansos ?? ""} placeholder="Ej: 10 min desayuno, 40 min almuerzo" className={inputCls} /></label>
          <div><Label>Beneficios y perks (uno por línea)</Label>
            <BeneficiosPerks defaultValue={busqueda?.beneficios ?? ""} /></div>
          <label><Label>Observaciones o notas de entrega importantes</Label>
            <textarea name="observaciones" defaultValue={busqueda?.observaciones ?? ""} rows={2} className={inputCls} /></label>
        </div>
      </section>

      {/* 5 · Index de Skills */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-indigo-500">
          5 · Habilidades y tecnologías requeridas (Index de Skills)
        </h2>
        <p className="mb-4 text-xs text-slate-400">Clic sobre las habilidades que requiere el puesto para agregarlas.</p>
        <SkillsIndex defaultValue={busqueda?.habilidades_requeridas ?? ""} />
      </section>

      {/* 6 · Flyer */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">6 · Flyer promocional</h2>
        <div className="flex flex-wrap items-start gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">{busqueda?.flyer_imagen_path ? "Reemplazar flyer" : "Imagen (PNG, JPG o WebP)"}</span>
            <input type="file" name="flyer" accept=".png,.jpg,.jpeg,.webp"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700" />
          </label>
          {busqueda?.flyer_imagen_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlPublicaFlyer(busqueda.flyer_imagen_path)} alt="Flyer actual" className="max-h-40 rounded-xl border border-slate-200 object-contain" />
          )}
        </div>
      </section>

      {/* 7 · Gestión interna */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">7 · Gestión interna</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label><Label>Estado</Label>
            <select name="estado_id" defaultValue={busqueda?.estado_id ?? ""} className={inputCls}>
              <option value="">Sin estado</option>
              {(estados ?? []).map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select></label>
          <label><Label>Selector responsable</Label>
            <select name="selector_asignado_id" defaultValue={busqueda?.selector_asignado_id ?? ""} className={inputCls}>
              <option value="">Sin asignar</option>
              {(selectores ?? []).map((s) => (
                <option key={s.id} value={s.id}>{`${s.nombre ?? ""} ${s.apellido ?? ""}`.trim() || `Selector #${s.id}`}</option>
              ))}
            </select></label>
          <label><Label>Fecha de vencimiento</Label>
            <input type="date" name="fecha_vencimiento" defaultValue={busqueda?.fecha_vencimiento ?? ""} className={inputCls} /></label>
          <label className="sm:col-span-2"><Label>Notas internas</Label>
            <textarea name="notas_internas" defaultValue={busqueda?.notas_internas ?? ""} rows={2} className={inputCls} /></label>
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
