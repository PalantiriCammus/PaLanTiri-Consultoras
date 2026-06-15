"use client";

import { useEffect, useState } from "react";
import { eliminarInstancia } from "./actions";

export function EliminarInstancia({
  id,
  url,
  nombre,
}: {
  id: number;
  url: string;
  nombre: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [tambienVercel, setTambienVercel] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");

  const host = url.replace(/^https?:\/\//, "");
  const slug = host.endsWith(".vercel.app") ? host.replace(".vercel.app", "") : null;
  const puedeEliminar = !tambienVercel || confirmacion.trim() === slug;

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
      >
        Quitar
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900">Quitar {nombre}</h3>
            <p className="mt-2 text-sm text-slate-600">
              Se quita de esta Consola (deja de monitorearse). La app y la base de datos
              <b> siguen funcionando</b> salvo que marques la opción de abajo.
            </p>

            <form action={eliminarInstancia} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="url" value={url} />

              {slug && (
                <label className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-sm">
                  <input
                    type="checkbox"
                    name="tambienVercel"
                    checked={tambienVercel}
                    onChange={(e) => setTambienVercel(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-rose-800">
                    También <b>eliminar el proyecto en Vercel</b> (<code>{slug}</code>).
                    <span className="block text-xs text-rose-600">
                      ⚠️ Irreversible. La base de Supabase NO se borra (eso lo hacés en su cuenta).
                    </span>
                  </span>
                </label>
              )}

              {tambienVercel && slug && (
                <label className="block text-sm">
                  <span className="text-slate-600">
                    Para confirmar, escribí <code className="rounded bg-slate-100 px-1">{slug}</code>:
                  </span>
                  <input
                    type="text"
                    value={confirmacion}
                    onChange={(e) => setConfirmacion(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    placeholder={slug}
                  />
                </label>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!puedeEliminar}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tambienVercel ? "Quitar y eliminar de Vercel" : "Quitar del monitoreo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
