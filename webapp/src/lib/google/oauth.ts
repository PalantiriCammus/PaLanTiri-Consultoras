import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

// Callback ÚNICO/central: la única URL de redirección registrada en Google.
// TODAS las instancias (madre y consultoras) usan esta misma URL, así no hay
// que registrar una por consultora. El callback central reenvía el código a
// la instancia que inició el flujo (firmada en el state). Se puede sobreescribir
// por env var; por defecto apunta a la instancia madre.
const CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ??
  "https://pa-lan-tiri-consultoras.vercel.app/api/google/callback";

// Secreto para firmar el state (HMAC). Reutiliza el client secret de Google,
// que ya está presente en todas las instancias.
const STATE_SECRET = process.env.GOOGLE_STATE_SECRET || CLIENT_SECRET || "palantiri";

// calendar.events: eventos de entrevistas con Meet.
// drive.file: subir CVs al Drive de la consultora (solo archivos creados
// por esta app, no da acceso al resto del Drive).
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
];

type TokenGuardado = {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // epoch ms
  scope?: string;
};

export function googleConfigurado(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && SITE_URL);
}

export function redirectUri(): string {
  return CALLBACK_URL;
}

// URL de consentimiento de Google. access_type=offline + prompt=consent
// garantizan recibir un refresh_token para operar sin usuario presente.
// El state lleva firmado el origen de la instancia que inicia el flujo.
export function urlAutorizacion(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// --- State firmado (HMAC) para el callback único ---------------------------
// El state viaja a Google y vuelve. Lo firmamos para que el callback central
// solo reenvíe a orígenes que nosotros generamos (evita open-redirect) y para
// que la instancia destino confíe en el origen.

function b64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}

export function firmarState(payload: { origin: string; nonce: string }): string {
  const body = b64url(JSON.stringify({ ...payload, ts: Date.now() }));
  const sig = crypto.createHmac("sha256", STATE_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verificarState(state: string): { origin: string; nonce: string } | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const esperado = crypto.createHmac("sha256", STATE_SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof data.origin !== "string" || typeof data.nonce !== "string") return null;
    if (typeof data.ts !== "number" || Date.now() - data.ts > 10 * 60_000) return null;
    return { origin: data.origin, nonce: data.nonce };
  } catch {
    return null;
  }
}

export async function intercambiarCodigo(code: string): Promise<TokenGuardado> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token error ${res.status}: ${await res.text()}`);

  const json = await res.json();
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + (json.expires_in ?? 3600) * 1000,
    scope: json.scope,
  };
}

// ¿Hay alguna cuenta de Google conectada? (la usa la UI para mostrar estado)
export async function googleConectado(): Promise<boolean> {
  if (!googleConfigurado()) return false;
  const admin = createAdminClient();
  const { count } = await admin
    .from("google_tokens")
    .select("*", { count: "exact", head: true });
  return (count ?? 0) > 0;
}

// Devuelve un access_token vigente de la cuenta conectada (refrescándolo si
// venció) o null si no hay cuenta conectada.
export async function getAccessToken(): Promise<string | null> {
  if (!googleConfigurado()) return null;

  const admin = createAdminClient();
  const { data: fila } = await admin
    .from("google_tokens")
    .select("id, token")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!fila) return null;

  const token = fila.token as TokenGuardado;

  if (token.expires_at > Date.now() + 60_000) {
    return token.access_token;
  }

  if (!token.refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error(`Google refresh error ${res.status}: ${await res.text()}`);
    return null;
  }

  const json = await res.json();
  const actualizado: TokenGuardado = {
    ...token,
    access_token: json.access_token,
    expires_at: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  await admin.from("google_tokens").update({ token: actualizado }).eq("id", fila.id);

  return actualizado.access_token;
}

// Revoca el token en Google y borra la conexión local.
export async function desconectarGoogle(): Promise<void> {
  const admin = createAdminClient();
  const { data: filas } = await admin.from("google_tokens").select("id, token");

  for (const fila of filas ?? []) {
    const token = fila.token as TokenGuardado;
    const valor = token.refresh_token ?? token.access_token;
    if (valor) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(valor)}`, {
        method: "POST",
      }).catch(() => {});
    }
  }

  await admin.from("google_tokens").delete().gte("id", 0);
}
