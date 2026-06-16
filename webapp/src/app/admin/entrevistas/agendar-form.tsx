"use client";

import { useState } from "react";
import { agendarEntrevista } from "./actions";
import { FiltrosAnidados } from "./filtros-anidados";

type Postulacion = {
  id: number;
  postulantes: { nombre: string; apellido: string } | null;
  perfiles_busqueda: {
    id: number;
    titulo_puesto: string;
    empresas: { id: number; nombre: string } | null;
  } | null;
};

type AgendarFormProps = {
  postulacionesActivas: Postulacion[];
  hayGoogle: boolean;
};

export function AgendarForm({ postulacionesActivas, hayGoogle }: AgendarFormProps) {
  const [postulacionId, setPostulacionId] = useState<number | null>(null);
  const [tipo, setTipo] = useState("seleccion");
  const [fechaHora, setFechaHora] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState(60);
  const [entrevistador, setEntrevistador] = useState("");
  const [googleMeetUrl, setGoogleMeetUrl] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [crearMeet, setCrearMeet] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!postulacionId) {
      alert("Selecciona una postulación");
      return;
    }

    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("postulacion_id", String(postulacionId));
      formData.append("tipo", tipo);
      formData.append("fecha_hora", fechaHora);
      formData.append("duracion_minutos", String(duracionMinutos));
      formData.append("entrevistador", entrevistador);
      if (googleMeetUrl) formData.append("google_meet_url", googleMeetUrl);
      if (ubicacion) formData.append("ubicacion", ubicacion);
      if (crearMeet) formData.append("crear_meet", "on");

      await agendarEntrevista(formData);
      alert("✓ Entrevista agendada");

      // Reset
      setPostulacionId(null);
      setTipo("seleccion");
      setFechaHora("");
      setDuracionMinutos(60);
      setEntrevistador("");
      setGoogleMeetUrl("");
      setUbicacion("");
      setCrearMeet(true);
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="sm:col-span-2 lg:col-span-3">
        <p className="mb-3 text-sm font-medium text-slate-700">📋 Seleccionar candidato</p>
        <FiltrosAnidados
          postulacionesActivas={postulacionesActivas}
          onSelect={setPostulacionId}
          selectedId={postulacionId ?? undefined}
        />
        {postulacionId && (
          <div className="mt-3 rounded-lg bg-indigo-50 p-2 text-xs text-indigo-700">
            ✓ Candidato seleccionado: ID {postulacionId}
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Tipo</span>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="seleccion">Selección</option>
          <option value="tecnica">Técnica</option>
          <option value="rrhh">RRHH</option>
          <option value="final">Final</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Fecha y hora</span>
        <input
          type="datetime-local"
          value={fechaHora}
          onChange={(e) => setFechaHora(e.target.value)}
          required
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Duración (minutos)</span>
        <input
          type="number"
          value={duracionMinutos}
          onChange={(e) => setDuracionMinutos(Number(e.target.value))}
          min={15}
          step={15}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Entrevistador</span>
        <input
          type="text"
          value={entrevistador}
          onChange={(e) => setEntrevistador(e.target.value)}
          placeholder="Nombre o email"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Link de Google Meet</span>
        <input
          type="url"
          value={googleMeetUrl}
          onChange={(e) => setGoogleMeetUrl(e.target.value)}
          placeholder={hayGoogle ? "Dejar vacío para generarlo automático" : "https://meet.google.com/..."}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Ubicación (si es presencial)</span>
        <input
          type="text"
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3">
        {hayGoogle && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={crearMeet}
              onChange={(e) => setCrearMeet(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-slate-700">
              Crear evento en Google Calendar con Meet
            </span>
          </label>
        )}
        {!hayGoogle && (
          <p className="text-xs text-slate-400">
            💡 Conectá Google en Configuración para crear el evento de Calendar automáticamente.
          </p>
        )}
        <button
          type="submit"
          disabled={enviando || !postulacionId}
          className="ml-auto rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enviando ? "Agendando..." : "Agendar entrevista"}
        </button>
      </div>
    </form>
  );
}
