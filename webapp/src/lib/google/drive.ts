import { createAdminClient } from "@/lib/supabase/admin";
import { getAccessToken } from "./oauth";

const CARPETA_CVS = "CVs - Plataforma Palantiri";

async function log(operation: string, status: string, message = "") {
  const admin = createAdminClient();
  await admin
    .from("google_logs")
    .insert({ service: "drive", operation, status, message })
    .then(() => {});
}

// Busca (o crea) la carpeta de CVs en el Drive de la cuenta conectada.
// Con el scope drive.file solo vemos archivos creados por esta app, así que
// la búsqueda es segura y barata.
async function obtenerCarpetaCvs(accessToken: string): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${CARPETA_CVS}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;

  const json = await res.json();
  if (json.files?.[0]?.id) return json.files[0].id;

  const creada = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: CARPETA_CVS, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!creada.ok) return null;
  return (await creada.json()).id ?? null;
}

// Sube un CV al Drive de la consultora y devuelve el ID del archivo,
// o null si no hay cuenta conectada / falta el permiso de Drive / falla.
export async function subirCvADrive(archivo: File, nombreVisible: string): Promise<string | null> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;

    const carpetaId = await obtenerCarpetaCvs(accessToken);
    const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const mime = archivo.type || "application/pdf";

    const metadata = JSON.stringify({
      name: `${nombreVisible}.${extension}`,
      ...(carpetaId ? { parents: [carpetaId] } : {}),
    });

    const boundary = `palantiri-${crypto.randomUUID()}`;
    const cabecera = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`;
    const cierre = `\r\n--${boundary}--`;
    const cuerpo = Buffer.concat([
      Buffer.from(cabecera),
      Buffer.from(await archivo.arrayBuffer()),
      Buffer.from(cierre),
    ]);

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: cuerpo,
      }
    );

    if (!res.ok) {
      await log("subir_cv", "error", `${res.status}: ${(await res.text()).slice(0, 500)}`);
      return null;
    }

    const json = await res.json();
    await log("subir_cv", "ok", `${nombreVisible} → ${json.id}`);
    return json.id ?? null;
  } catch (e) {
    await log("subir_cv", "error", String(e).slice(0, 500));
    return null;
  }
}

// Descarga un CV desde Drive (lo usa la ruta proxy /api/cv/[id]).
export async function descargarCvDeDrive(
  fileId: string
): Promise<{ body: ReadableStream<Uint8Array> | null; mime: string; nombre: string } | null> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;

    const [meta, contenido] = await Promise.all([
      fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=name,mimeType`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ),
      fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    if (!contenido.ok) return null;

    const info = meta.ok ? await meta.json() : {};
    return {
      body: contenido.body,
      mime: info.mimeType ?? "application/pdf",
      nombre: info.name ?? "cv.pdf",
    };
  } catch {
    return null;
  }
}
