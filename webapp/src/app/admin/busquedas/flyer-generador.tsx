"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { guardarFlyerGenerado } from "./actions";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function leerImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Envuelve y dibuja texto en el canvas; devuelve la Y final.
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

export function FlyerGenerador({
  busquedaId,
  puestoInicial = "",
  bulletsIniciales = [],
  ubicacionInicial = "",
  jornadaInicial = "",
  marcaInicial = "",
}: {
  busquedaId?: number;
  puestoInicial?: string;
  bulletsIniciales?: string[];
  ubicacionInicial?: string;
  jornadaInicial?: string;
  marcaInicial?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [title, setTitle] = useState("BUSCAMOS");
  const [puesto, setPuesto] = useState(puestoInicial || "Puesto Vacante");
  const [bullet1, setBullet1] = useState(bulletsIniciales[0] ?? "");
  const [bullet2, setBullet2] = useState(bulletsIniciales[1] ?? "");
  const [bullet3, setBullet3] = useState(bulletsIniciales[2] ?? "");
  const [location, setLocation] = useState(ubicacionInicial);
  const [schedule, setSchedule] = useState(jornadaInicial);
  const [bgColor, setBgColor] = useState("#081026");
  const [brandMain, setBrandMain] = useState(marcaInicial || "");
  const [brandSub, setBrandSub] = useState("Recursos Humanos");
  const [headerImg, setHeaderImg] = useState<HTMLImageElement | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const dibujar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 1080, 1080);

    // 1. Cabecera (0–540): imagen o gradiente
    if (headerImg) {
      const iw = headerImg.width;
      const ih = headerImg.height;
      const tw = 1080;
      const th = 540;
      const ir = iw / ih;
      const tr = tw / th;
      let sx, sy, sw, sh;
      if (ir > tr) {
        sh = ih;
        sw = ih * tr;
        sx = (iw - sw) / 2;
        sy = 0;
      } else {
        sw = iw;
        sh = iw / tr;
        sx = 0;
        sy = (ih - sh) / 2;
      }
      ctx.drawImage(headerImg, sx, sy, sw, sh, 0, 0, tw, th);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 1080, 540);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(1, "#1e293b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 540);
      ctx.font = '80px "Segoe UI Emoji"';
      ctx.textAlign = "center";
      ctx.fillText("💼", 540, 290);
      ctx.textAlign = "left";
    }

    // 2. Parte inferior (color dinámico)
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 540, 1080, 540);

    // 3. Título
    ctx.fillStyle = "#f2a134";
    ctx.font = '900 68px "Outfit", "Inter", "Arial Black", sans-serif';
    ctx.fillText((title || "BUSCAMOS").toUpperCase(), 40, 630);

    // 4. Puesto + lupa
    ctx.fillStyle = "#74c0fc";
    ctx.font = '700 48px "Outfit", "Inter", "Arial", sans-serif';
    ctx.fillText(puesto, 40, 700);
    const pw = ctx.measureText(puesto).width;
    ctx.font = '38px "Segoe UI Emoji", "Apple Color Emoji"';
    ctx.fillText("🔍", Math.min(40 + pw + 20, 1000), 696);

    // 5. Tarjeta blanca redondeada
    ctx.fillStyle = "#ffffff";
    const rx = 40;
    const ry = 740;
    const rw = 1000;
    const rh = 265;
    const rad = 16;
    ctx.beginPath();
    ctx.moveTo(rx + rad, ry);
    ctx.lineTo(rx + rw - rad, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rad);
    ctx.lineTo(rx + rw, ry + rh - rad);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rad, ry + rh);
    ctx.lineTo(rx + rad, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rad);
    ctx.lineTo(rx, ry + rad);
    ctx.quadraticCurveTo(rx, ry, rx + rad, ry);
    ctx.closePath();
    ctx.fill();

    // 6. Bullets
    let textY = 790;
    const maxWidth = 860;
    const lineHeight = 32;
    const bullets = [bullet1, bullet2, bullet3].filter((b) => b.trim().length > 0);
    bullets.forEach((bullet) => {
      ctx.fillStyle = "#3a86ff";
      ctx.font = '700 22px "Inter", sans-serif';
      ctx.fillText("▶", 70, textY);
      ctx.fillStyle = "#1e293b";
      ctx.font = '500 24px "Inter", "Segoe UI", sans-serif';
      const endY = drawWrappedText(ctx, bullet, 110, textY, maxWidth, lineHeight);
      textY = endY + 36;
    });

    // 7. Ubicación y jornada (abajo de la tarjeta)
    const minActionsY = 935;
    if (textY < minActionsY) textY = minActionsY;
    if (location) {
      ctx.font = '28px "Segoe UI Emoji", "Apple Color Emoji"';
      ctx.fillText("📍", 70, textY);
      ctx.fillStyle = "#1e293b";
      ctx.font = '500 24px "Inter", "Segoe UI", sans-serif';
      ctx.fillText(location, 110, textY);
      textY += 45;
    }
    if (schedule) {
      ctx.font = '28px "Segoe UI Emoji", "Apple Color Emoji"';
      ctx.fillText("🕒", 70, textY);
      ctx.fillStyle = "#1e293b";
      ctx.font = '500 24px "Inter", "Segoe UI", sans-serif';
      ctx.fillText(schedule, 110, textY);
    }

    // 8. Logo o marca (abajo derecha)
    if (logoImg) {
      const maxW = 200;
      const maxH = 65;
      let lw = logoImg.width;
      let lh = logoImg.height;
      if (lw > maxW) {
        lh = (maxW / lw) * lh;
        lw = maxW;
      }
      if (lh > maxH) {
        lw = (maxH / lh) * lw;
        lh = maxH;
      }
      ctx.drawImage(logoImg, 1040 - lw, 1055 - lh, lw, lh);
    } else {
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = '800 36px "Outfit", "Inter", sans-serif';
      ctx.fillText(brandMain || "Consultora", 1040, 1035);
      ctx.fillStyle = "#f2a134";
      ctx.font = '600 16px "Outfit", sans-serif';
      ctx.fillText(brandSub, 1040, 1058);
      ctx.textAlign = "left";
    }
  }, [title, puesto, bullet1, bullet2, bullet3, location, schedule, bgColor, brandMain, brandSub, headerImg, logoImg]);

  useEffect(() => {
    dibujar();
  }, [dibujar]);

  function descargar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const safe = (puesto || "vacante").toLowerCase().replace(/[^a-z0-9]/g, "_");
    const link = document.createElement("a");
    link.download = `flyer_${safe}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  }

  async function guardar() {
    const canvas = canvasRef.current;
    if (!canvas || !busquedaId) return;
    setGuardando(true);
    setMensaje("");
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const res = await guardarFlyerGenerado(busquedaId, dataUrl);
      if (res.ok) setMensaje("✓ Flyer guardado en la búsqueda.");
    } catch (e) {
      setMensaje(`Error al guardar: ${e instanceof Error ? e.message : e}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Controles */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Título</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Puesto</span>
            <input value={puesto} onChange={(e) => setPuesto(e.target.value)} className={inputCls} />
          </label>
        </div>

        <div className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Requisitos destacados (hasta 3)</span>
          <input value={bullet1} onChange={(e) => setBullet1(e.target.value)} placeholder="Ej: +3 años de experiencia" className={`${inputCls} mb-2`} />
          <input value={bullet2} onChange={(e) => setBullet2(e.target.value)} placeholder="Ej: Manejo de Excel avanzado" className={`${inputCls} mb-2`} />
          <input value={bullet3} onChange={(e) => setBullet3(e.target.value)} placeholder="Ej: Inglés intermedio" className={inputCls} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Ubicación</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej: Capital Federal" className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Jornada</span>
            <input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="Ej: Full Time - presencial" className={inputCls} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Color de fondo</span>
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Imagen de cabecera</span>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setHeaderImg(await leerImagen(f));
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-indigo-700"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Marca (si no subís logo)</span>
            <input value={brandMain} onChange={(e) => setBrandMain(e.target.value)} placeholder="Nombre de la consultora" className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Logo (opcional)</span>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setLogoImg(await leerImagen(f));
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-indigo-700"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          {busquedaId ? (
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar en la búsqueda"}
            </button>
          ) : (
            <span className="text-xs text-slate-400">
              Guardá la búsqueda primero para poder adjuntarle el flyer; por ahora podés descargarlo.
            </span>
          )}
          <button
            type="button"
            onClick={descargar}
            className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
          >
            Descargar imagen
          </button>
          {mensaje && <span className="text-xs text-slate-600">{mensaje}</span>}
        </div>
      </div>

      {/* Vista previa */}
      <div>
        <canvas
          ref={canvasRef}
          width={1080}
          height={1080}
          className="w-full rounded-2xl border border-slate-200 shadow-sm"
        />
      </div>
    </div>
  );
}
