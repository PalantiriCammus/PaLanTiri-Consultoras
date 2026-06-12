import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Estado de la instancia, para monitoreo desde la consola madre de Palantiri.
// Público a propósito: no expone secretos, solo qué servicios están configurados.
export async function GET() {
  const inicio = Date.now();
  let db = false;
  let consultora = "";

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("configuracion_consultora")
      .select("nombre")
      .eq("id", 1)
      .maybeSingle();
    db = !error;
    consultora = data?.nombre ?? "";
  } catch {
    db = false;
  }

  return NextResponse.json({
    status: db ? "ok" : "error",
    consultora,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    servicios: {
      db,
      email: Boolean(process.env.RESEND_API_KEY),
      captcha: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
      google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    latencia_ms: Date.now() - inicio,
    timestamp: new Date().toISOString(),
  });
}
