"use client";

import { useState } from "react";
import { CATALOGO_SKILLS } from "@/lib/skills";

// Índice clickeable reutilizable (skills, títulos, etc.). Mantiene el set de
// seleccionados y los vuelca en un input hidden (separados por coma).
export function SkillsIndex({
  defaultValue = "",
  name = "habilidades_requeridas",
  catalogo = CATALOGO_SKILLS,
}: {
  defaultValue?: string;
  name?: string;
  catalogo?: { grupo: string; skills: string[] }[];
}) {
  const inicial = defaultValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const [sel, setSel] = useState<Set<string>>(new Set(inicial));

  function toggle(skill: string) {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  }

  const lista = Array.from(sel);

  return (
    <div>
      <input type="hidden" name={name} value={lista.join(", ")} />

      {lista.length > 0 && (
        <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
          <p className="mb-1 text-xs font-semibold text-indigo-600">
            Seleccionadas ({lista.length}):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {lista.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
              >
                {s} ✕
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {catalogo.map((cat) => (
          <div key={cat.grupo}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {cat.grupo}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {cat.skills.map((s) => {
                const activa = sel.has(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(s)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      activa
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
