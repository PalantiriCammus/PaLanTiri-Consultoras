import { NextRequest, NextResponse } from "next/server";
import { verificarState } from "@/lib/google/oauth";

// CALLBACK ÚNICO (central). Es la única URL registrada en Google. NO procesa
// ni guarda tokens: solo valida la firma del state y REENVÍA el código a la
// instancia que inició el flujo (su origen va firmado en el state). Es público
// a propósito (la sesión del usuario vive en la instancia de origen, no acá);
// la firma HMAC impide reenviar a orígenes no generados por nosotros, y la
// instancia destino revalida sesión + nonce en /api/google/finalize.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/admin/configuracion?google=error", request.url));
  }

  const datos = verificarState(state);
  if (!datos) {
    return NextResponse.redirect(new URL("/admin/configuracion?google=error", request.url));
  }

  // Reenvía a la instancia de origen para que ella haga el intercambio y guarde
  // el token en SU base.
  const destino = new URL("/api/google/finalize", datos.origin);
  destino.searchParams.set("code", code);
  destino.searchParams.set("state", state);
  return NextResponse.redirect(destino);
}
