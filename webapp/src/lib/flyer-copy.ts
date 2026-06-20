// Arma el texto "copy" del flyer (listo para copiar/pegar en WhatsApp, redes, etc.).
// Lo usan tanto el generador de flyer (admin) como el portal de selectores, para
// que el texto sea idéntico en ambos lados.
export function construirCopyFlyer({
  titulo = "BUSCAMOS",
  puesto,
  bullets = [],
  ubicacion = "",
  jornada = "",
  marca = "",
}: {
  titulo?: string;
  puesto: string;
  bullets?: string[];
  ubicacion?: string;
  jornada?: string;
  marca?: string;
}): string {
  const lineas: string[] = [];
  lineas.push(`🔍 ${(titulo || "BUSCAMOS").toUpperCase()}: ${puesto}`);

  const bs = bullets.filter((b) => b.trim().length > 0);
  if (bs.length > 0) {
    lineas.push("");
    lineas.push("Requisitos:");
    bs.forEach((b) => lineas.push(`▶ ${b}`));
  }

  if (ubicacion || jornada) lineas.push("");
  if (ubicacion) lineas.push(`📍 ${ubicacion}`);
  if (jornada) lineas.push(`🕒 ${jornada}`);

  if (marca) {
    lineas.push("");
    lineas.push(marca);
  }

  return lineas.join("\n").trim();
}
