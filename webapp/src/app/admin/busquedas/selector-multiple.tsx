"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

// Multi-selección por desplegable + chips removibles (misma mecánica que el
// "Título requerido"). Vuelca lo elegido en un input hidden separado por coma.
// Permite también escribir uno propio que no esté en la lista.
// Acepta una lista plana (opciones) o un catálogo agrupado (optgroups).
export function SelectorMultiple({
  name,
  opciones,
  catalogo,
  defaultValue = "",
  placeholder = "Elegí de la lista…",
}: {
  name: string;
  opciones?: string[];
  catalogo?: { grupo: string; skills: string[] }[];
  defaultValue?: string;
  placeholder?: string;
}) {
  const [sel, setSel] = useState<string[]>(
    defaultValue.split(",").map((s) => s.trim()).filter(Boolean),
  );
  const [otro, setOtro] = useState("");

  function agregar(valor: string) {
    const v = valor.trim();
    if (!v) return;
    setSel((prev) => (prev.some((s) => s.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]));
  }

  function quitar(s: string) {
    setSel((prev) => prev.filter((x) => x !== s));
  }

  const yaElegido = (o: string) => sel.some((s) => s.toLowerCase() === o.toLowerCase());

  return (
    <div>
      <input type="hidden" name={name} value={sel.join(", ")} />

      {sel.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {sel.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => quitar(s)}
              className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
            >
              {s} ✕
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) agregar(e.target.value);
          }}
          className={inputCls}
        >
          <option value="">{placeholder}</option>
          {catalogo
            ? catalogo.map((g) => (
                <optgroup key={g.grupo} label={g.grupo}>
                  {g.skills.filter((o) => !yaElegido(o)).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </optgroup>
              ))
            : (opciones ?? []).filter((o) => !yaElegido(o)).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
        </select>
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={otro}
          onChange={(e) => setOtro(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar(otro);
              setOtro("");
            }
          }}
          placeholder="…o escribí otro y Enter"
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => {
            agregar(otro);
            setOtro("");
          }}
          className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
