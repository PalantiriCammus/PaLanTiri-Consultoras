import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { descargarCvDeDrive } from "@/lib/google/drive";

// Sirve un CV guardado en el Drive de la consultora. Requiere sesión:
// el navegador del staff/selector pide esta ruta y la app lo descarga de
// Drive con el token de la cuenta conectada (el archivo nunca es público).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { id } = await params;
  const archivo = await descargarCvDeDrive(id);

  if (!archivo?.body) {
    return new NextResponse("CV no disponible (¿la cuenta de Google sigue conectada?)", {
      status: 404,
    });
  }

  return new NextResponse(archivo.body, {
    headers: {
      "Content-Type": archivo.mime,
      "Content-Disposition": `inline; filename="${archivo.nombre.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
