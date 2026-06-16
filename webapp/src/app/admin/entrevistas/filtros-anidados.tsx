"use client";

import { useState, useMemo } from "react";

type Postulacion = {
  id: number;
  postulantes: { nombre: string; apellido: string } | null;
  perfiles_busqueda: {
    id: number;
    titulo_puesto: string;
    empresas: { id: number; nombre: string } | null;
  } | null;
};

type FiltrosAnidadosProps = {
  postulacionesActivas: Postulacion[];
  onSelect: (postulacionId: number) => void;
  selectedId?: number;
};

export function FiltrosAnidados({
  postulacionesActivas,
  onSelect,
  selectedId,
}: FiltrosAnidadosProps) {
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<number | null>(null);
  const [busquedaSeleccionada, setBusquedaSeleccionada] = useState<number | null>(null);

  // Obtener empresas únicas
  const empresas = useMemo(() => {
    const map = new Map<number, string>();
    postulacionesActivas.forEach((p) => {
      if (p.perfiles_busqueda?.empresas) {
        map.set(p.perfiles_busqueda.empresas.id, p.perfiles_busqueda.empresas.nombre);
      }
    });
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [postulacionesActivas]);

  // Obtener búsquedas filtradas por empresa
  const busquedas = useMemo(() => {
    if (!empresaSeleccionada) return [];
    const map = new Map<number, string>();
    postulacionesActivas.forEach((p) => {
      if (
        p.perfiles_busqueda?.empresas?.id === empresaSeleccionada &&
        p.perfiles_busqueda.id
      ) {
        map.set(p.perfiles_busqueda.id, p.perfiles_busqueda.titulo_puesto);
      }
    });
    return Array.from(map.entries())
      .map(([id, titulo]) => ({ id, titulo }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [empresaSeleccionada, postulacionesActivas]);

  // Obtener candidatos filtrados por búsqueda
  const candidatos = useMemo(() => {
    if (!busquedaSeleccionada) return [];
    return postulacionesActivas
      .filter((p) => p.perfiles_busqueda?.id === busquedaSeleccionada)
      .sort((a, b) => {
        const nombreA = a.postulantes
          ? `${a.postulantes.nombre} ${a.postulantes.apellido}`
          : "?";
        const nombreB = b.postulantes
          ? `${b.postulantes.nombre} ${b.postulantes.apellido}`
          : "?";
        return nombreA.localeCompare(nombreB);
      });
  }, [busquedaSeleccionada, postulacionesActivas]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          1. Empresa
        </label>
        <select
          value={empresaSeleccionada ?? ""}
          onChange={(e) => {
            const val = e.target.value ? parseInt(e.target.value) : null;
            setEmpresaSeleccionada(val);
            setBusquedaSeleccionada(null);
          }}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">-- Seleccionar empresa --</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </div>

      {empresaSeleccionada && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            2. Búsqueda / Posición
          </label>
          <select
            value={busquedaSeleccionada ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : null;
              setBusquedaSeleccionada(val);
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">-- Seleccionar búsqueda --</option>
            {busquedas.map((b) => (
              <option key={b.id} value={b.id}>
                {b.titulo}
              </option>
            ))}
          </select>
        </div>
      )}

      {busquedaSeleccionada && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            3. Candidato
          </label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => {
              if (e.target.value) {
                onSelect(parseInt(e.target.value));
              }
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">-- Seleccionar candidato --</option>
            {candidatos.map((c) => {
              const nombre = c.postulantes
                ? `${c.postulantes.nombre} ${c.postulantes.apellido}`
                : "Candidato eliminado";
              return (
                <option key={c.id} value={c.id}>
                  {nombre}
                </option>
              );
            })}
          </select>
        </div>
      )}
    </div>
  );
}
