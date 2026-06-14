import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { esStaff } from "@/lib/types";
import { googleConfigurado, urlAutorizacion, firmarState } from "@/lib/google/oauth";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export async function GET(request: Request) {
  const profile = await getProfile();
  if (!profile || !esStaff(profile.rol)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!googleConfigurado()) {
    return NextResponse.redirect(new URL("/admin/configuracion?google=sin_config", request.url));
  }

  // Firmamos nuestro propio origen en el state y guardamos el nonce en una
  // cookie para validar la vuelta (anti-CSRF). El callback central reenvía
  // a este origen y finalize valida el nonce.
  const nonce = crypto.randomUUID();
  const state = firmarState({ origin: SITE_URL, nonce });

  const res = NextResponse.redirect(urlAutorizacion(state));
  res.cookies.set("g_oauth_nonce", nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
