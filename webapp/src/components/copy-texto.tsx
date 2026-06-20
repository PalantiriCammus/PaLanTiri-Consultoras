"use client";

import { useState } from "react";

// Bloque colapsable con un texto listo para copiar y un botón "Copiar".
export function CopyTexto({ texto, label = "Texto para copiar" }: { texto: string; label?: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* el usuario puede seleccionar y copiar a mano */
    }
  }

  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-slate-600">
        📋 {label}
      </summary>
      <div className="mt-2">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={copiar}
            className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
          >
            {copiado ? "✓ Copiado" : "Copiar texto"}
          </button>
        </div>
        <textarea
          readOnly
          value={texto}
          rows={8}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 outline-none"
        />
      </div>
    </details>
  );
}
