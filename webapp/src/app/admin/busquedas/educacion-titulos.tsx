"use client";

import { useId, useState } from "react";
import { titulosPorEducacion } from "@/lib/titulos";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const NIVELES = [
  "Secundario Completo",
  "Terciario en Curso",
  "Terciario Completo",
  "Universitario en Curso",
  "Universitario Completo",
  "Posgrado / Maestría",
  "Sin Especificar",
];

// Educación mínima + Título requerido (multi-selección filtrada por el nivel).
// Reutilizable: en postulante el título se guarda en "titulaciones".
export function EducacionTitulos({
  defaultEducacion = "",
  defaultTitulos = "",
  educacionName = "educacion_minima",
  titulosName = "titulos_requeridos",
  educacionLabel = "Educación mínima",
}: {
  defaultEducacion?: string;
  defaultTitulos?: string;
  educacionName?: string;
  titulosName?: string;
  educacionLabel?: string;
}) {
  const listId = useId();
  const [educacion, setEducacion] = useState(defaultEducacion);
  const [titulos, setTitulos] = useState<string[]>(
    defaultTitulos.split(",").map((t) => t.trim()).filter(Boolean),
  );
  const [entrada, setEntrada] = useState("");

  const opciones = titulosPorEducacion(educacion);
  const mostrarTitulos = opciones.length > 0;

  function agregar(valor: string) {
    const v = valor.trim();
    if (!v) return;
    setTitulos((prev) => (prev.some((t) => t.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]));
    setEntrada("");
  }

  function quitar(t: string) {
    setTitulos((prev) => prev.filter((x) => x !== t));
  }

  const nivelLabel = educacion.toLowerCase().includes("terciario")
    ? "terciarios"
    : educacion.toLowerCase().includes("universitario")
      ? "universitarios"
      : "de posgrado";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label>
        <span className="mb-1 block text-sm font-medium text-slate-700">{educacionLabel}</span>
        <select
          name={educacionName}
          value={educacion}
          onChange={(e) => setEducacion(e.target.value)}
          className={inputCls}
        >
          <option value="">-- Seleccionar --</option>
          {NIVELES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      {/* hidden: siempre presente para que la acción lo lea */}
      <input type="hidden" name={titulosName} value={titulos.join(", ")} />

      {/* El bloque de títulos se muestra SIEMPRE (así se ven y se pueden quitar
          los ya cargados aunque el nivel no tenga catálogo); sólo el
          autocompletado (datalist) depende de que haya opciones del nivel. */}
      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Título requerido{" "}
          <span className="font-normal text-slate-400">
            {mostrarTitulos ? `(podés elegir varios ${nivelLabel})` : "(elegí el nivel para sugerencias, o escribí uno)"}
          </span>
        </span>

        {titulos.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {titulos.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => quitar(t)}
                className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
              >
                {t} ✕
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            list={listId}
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregar(entrada);
              }
            }}
            placeholder="Elegí de la lista o escribí uno…"
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => agregar(entrada)}
            className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Agregar
          </button>
        </div>
        {mostrarTitulos && (
          <datalist id={listId}>
            {opciones.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        )}
      </div>
    </div>
  );
}
