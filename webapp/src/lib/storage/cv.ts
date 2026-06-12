import { createAdminClient } from "@/lib/supabase/admin";
import { subirCvADrive } from "@/lib/google/drive";

const EXTENSIONES_PERMITIDAS = ["pdf", "doc", "docx"];

// Prefijo en cv_path que indica que el archivo vive en el Drive de la
// consultora (gdrive:<fileId>) en lugar del bucket de Supabase.
const PREFIJO_DRIVE = "gdrive:";

// Sube un CV al bucket privado "cvs" y devuelve la ruta para guardar en
// postulantes.cv_path. La carpeta agrupa por origen (id de selector o "admin").
export async function subirCv(archivo: File, carpeta: string): Promise<string> {
  const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "";
  if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
    throw new Error("El CV debe ser PDF o Word (.pdf, .doc, .docx).");
  }

  const ruta = `${carpeta}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from("cvs").upload(ruta, archivo, {
    contentType: archivo.type || "application/pdf",
  });
  if (error) throw new Error(`No se pudo subir el CV: ${error.message}`);

  return ruta;
}

// Devuelve una URL firmada (temporal) para ver/descargar un CV del bucket privado.
export async function urlFirmadaCv(
  ruta: string,
  expiraSegundos = 60 * 60
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from("cvs").createSignedUrl(ruta, expiraSegundos);
  return data?.signedUrl ?? null;
}

// Sube un CV priorizando el Drive de la consultora (si su cuenta de Google
// está conectada con permiso de Drive); si no, cae al bucket de Supabase.
// Devuelve el valor a guardar en cv_path: "gdrive:<id>" o la ruta del bucket.
export async function subirCvConDrive(
  archivo: File,
  nombreVisible: string,
  carpetaFallback: string
): Promise<string> {
  const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "";
  if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
    throw new Error("El CV debe ser PDF o Word (.pdf, .doc, .docx).");
  }

  const driveId = await subirCvADrive(archivo, nombreVisible);
  if (driveId) return `${PREFIJO_DRIVE}${driveId}`;

  return subirCv(archivo, carpetaFallback);
}

// URL para ver un CV sin importar dónde viva: ruta proxy autenticada si está
// en Drive, URL firmada si está en el bucket de Supabase.
export async function urlVerCv(ruta: string, expiraSegundos = 60 * 60): Promise<string | null> {
  if (ruta.startsWith(PREFIJO_DRIVE)) {
    return `/api/cv/${encodeURIComponent(ruta.slice(PREFIJO_DRIVE.length))}`;
  }
  return urlFirmadaCv(ruta, expiraSegundos);
}
