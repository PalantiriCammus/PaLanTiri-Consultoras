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
export function EducacionTitulos({
  defaultEducacion = "",
  defaultTitulos = "",
}: {
  defaultEducacion?: string;
  defaultTitulos?: string;
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
        <span className="mb-1 block text-sm font-medium text-slate-700">Educación mínima</span>
        <select
          name="educacion_minima"
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
      <input type="hidden" name="titulos_requeridos" value={titulos.join(", ")} />

      {mostrarTitulos && (
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Título requerido <span className="font-normal text-slate-400">(podés elegir varios {nivelLabel})</span>
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
          <datalist id={listId}>
            {opciones.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </div>
      )}
    </div>
  );
}
