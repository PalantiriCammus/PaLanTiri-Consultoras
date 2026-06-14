import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { esStaff } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { intercambiarCodigo, verificarState } from "@/lib/google/oauth";

// Recibe el código reenviado por el callback central, valida sesión + nonce,
// intercambia el código por tokens y los guarda en la base de ESTA instancia.
export async function GET(request: NextRequest) {
  const profile = await getProfile();
  if (!profile || !esStaff(profile.rol)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/admin/configuracion?google=error", request.url));
  }

  // El state tiene que ser válido (firma) y el nonce coincidir con la cookie
  // que dejamos al iniciar el flujo (anti-CSRF).
  const datos = verificarState(state);
  const nonceCookie = request.cookies.get("g_oauth_nonce")?.value;
  if (!datos || !nonceCookie || datos.nonce !== nonceCookie) {
    return NextResponse.redirect(new URL("/admin/configuracion?google=error", request.url));
  }

  try {
    const token = await intercambiarCodigo(code);
    const admin = createAdminClient();
    const { error } = await admin
      .from("google_tokens")
      .upsert({ profile_id: profile.id, token }, { onConflict: "profile_id" });
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error("Google finalize falló:", e);
    return NextResponse.redirect(new URL("/admin/configuracion?google=error", request.url));
  }

  const res = NextResponse.redirect(new URL("/admin/configuracion?google=conectado", request.url));
  res.cookies.delete("g_oauth_nonce");
  return res;
}
