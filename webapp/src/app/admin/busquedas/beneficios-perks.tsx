"use client";

import { useState } from "react";

const SUGERIDOS = [
  "🩺 Medicina Prepaga",
  "🏠 Home Office / Híbrido",
  "⏱️ Horarios Flexibles",
  "📚 Clases de Inglés",
  "📈 Ajustes Salariales",
  "🍔 Almuerzo / Comedor",
  "💪 Gimnasio",
  "🎉 Cumpleaños Libre",
];

// Textarea de beneficios (uno por línea) + chips sugeridos que se agregan/quitan.
export function BeneficiosPerks({ defaultValue = "" }: { defaultValue?: string }) {
  const [texto, setTexto] = useState(defaultValue);

  function lineas(): string[] {
    return texto.split("\n").map((l) => l.trim()).filter(Boolean);
  }

  function toggle(perk: string) {
    const limpio = perk.replace(/^[^\p{L}\d]+/u, "").trim(); // saca el emoji inicial
    const actuales = lineas();
    const yaEsta = actuales.some((l) => l.toLowerCase() === limpio.toLowerCase());
    const nuevas = yaEsta
      ? actuales.filter((l) => l.toLowerCase() !== limpio.toLowerCase())
      : [...actuales, limpio];
    setTexto(nuevas.join("\n"));
  }

  return (
    <div>
      <textarea
        name="beneficios"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder={"- Medicina prepaga\n- Clases de inglés"}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <p className="mb-1 mt-2 text-xs font-semibold text-slate-400">
        Sugeridos (clic para agregar/quitar):
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SUGERIDOS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
