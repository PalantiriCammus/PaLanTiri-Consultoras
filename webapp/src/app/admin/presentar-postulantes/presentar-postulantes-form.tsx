"use client";

import { useState } from "react";
import { enviarPostulantes } from "./actions";

type Postulante = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  cv_path: string | null;
  postulaciones?: Array<{
    id: number;
    estado: string;
    perfiles_busqueda: { titulo_puesto: string } | null;
  }>;
};

type Empresa = {
  id: number;
  nombre: string;
};

export function PresentarPostulantesForm({
  empresas,
  postulantes: todosPostulantes,
}: {
  empresas: Empresa[];
  postulantes: Postulante[];
}) {
  const [selectedPostulantes, setSelectedPostulantes] = useState<Set<number>>(new Set());
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("");
  const [selectedEstado, setSelectedEstado] = useState("para_enviar_empresa");
  const [asunto, setAsunto] = useState("Presentación de Candidatos");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const postulantesParaEnviar = todosPostulantes.filter(
    (p) => p.postulaciones?.some((post) => post.estado === selectedEstado)
  );

  const handleTogglePostulante = (id: number) => {
    const nuevo = new Set(selectedPostulantes);
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    setSelectedPostulantes(nuevo);
  };

  const handleSeleccionarTodos = () => {
    if (selectedPostulantes.size === postulantesParaEnviar.length) {
      setSelectedPostulantes(new Set());
    } else {
      setSelectedPostulantes(new Set(postulantesParaEnviar.map((p) => p.id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedPostulantes.size === 0 || !selectedEmpresa) {
      alert("Selecciona al menos un postulante y una empresa");
      return;
    }

    setEnviando(true);
    try {
      const resultado = await enviarPostulantes({
        postulante_ids: Array.from(selectedPostulantes),
        empresa_id: parseInt(selectedEmpresa),
        asunto,
        mensaje,
      });

      if (resultado.ok) {
        alert(`✓ Presentación enviada a ${resultado.empresa_nombre}`);
        setSelectedPostulantes(new Set());
        setSelectedEmpresa("");
        setAsunto("Presentación de Candidatos");
        setMensaje("");
      } else {
        alert(`Error: ${resultado.error}`);
      }
    } catch (err) {
      alert(`Error al enviar: ${err}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtro de estado */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Filtrar postulantes por estado
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Estado de postulación</span>
          <select
            value={selectedEstado}
            onChange={(e) => {
              setSelectedEstado(e.target.value);
              setSelectedPostulantes(new Set());
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="para_enviar_empresa">Para enviar a empresa</option>
            <option value="presentado_selector">Presentado Selector</option>
            <option value="en_evaluacion">En evaluación</option>
            <option value="enviado_empresa">Enviado a Empresa</option>
            <option value="entrevistado_empresa">Entrevistado por empresa</option>
          </select>
        </label>
      </div>

      {/* Selector de postulantes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Postulantes ({postulantesParaEnviar.length})
          </h2>
          {postulantesParaEnviar.length > 0 && (
            <button
              type="button"
              onClick={handleSeleccionarTodos}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              {selectedPostulantes.size === postulantesParaEnviar.length
                ? "Deseleccionar todos"
                : "Seleccionar todos"}
            </button>
          )}
        </div>

        {postulantesParaEnviar.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay postulantes en estado "{selectedEstado}".
          </p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {postulantesParaEnviar.map((p) => (
              <label key={p.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selectedPostulantes.has(p.id)}
                  onChange={() => handleTogglePostulante(p.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">
                    {p.nombre} {p.apellido}
                  </p>
                  <p className="text-xs text-slate-500">{p.email}</p>
                  {p.postulaciones?.[0]?.perfiles_busqueda?.titulo_puesto && (
                    <p className="text-xs text-slate-500">
                      Posición: {p.postulaciones[0].perfiles_busqueda.titulo_puesto}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Formulario de envío */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Enviar a empresa
        </h2>

        <div className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Empresa destino *</span>
            <select
              value={selectedEmpresa}
              onChange={(e) => setSelectedEmpresa(e.target.value)}
              required
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">-- Seleccionar empresa --</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Asunto del email</span>
            <input
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Mensaje (opcional)</span>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={4}
              placeholder="Mensaje personalizado para acompañar los CVs..."
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-medium mb-1">📎 Se incluirán:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>{selectedPostulantes.size} CV(s)</li>
              <li>Informe de cada candidato</li>
              <li>Datos de contacto</li>
            </ul>
          </div>

          <div className="flex gap-3 border-t border-slate-100 pt-4">
            <button
              type="submit"
              disabled={enviando || selectedPostulantes.size === 0 || !selectedEmpresa}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enviando ? "Enviando..." : "Enviar presentación"}
            </button>
            <span className="text-xs text-slate-500 flex items-center">
              {selectedPostulantes.size > 0 && `${selectedPostulantes.size} seleccionado(s)`}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}
