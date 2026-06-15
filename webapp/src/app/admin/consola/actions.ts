"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

function val(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

// ---------------------------------------------------------------------------
// Alta automática de una consultora desde la UI (solo super_admin).
// Crea el proyecto en Vercel (conectado al repo, root webapp), le carga las
// env vars y dispara el deploy — el mismo flujo que el script
// scripts/crear-instancia.mjs, pero con un botón. Las claves compartidas
// (Google/Turnstile/Resend) se reutilizan de las env vars de ESTA instancia.
// ---------------------------------------------------------------------------

export type ResultadoAlta = { ok: boolean; mensaje: string; url?: string };

const VERCEL_API = "https://api.vercel.com";
const REPO = process.env.VERCEL_GIT_REPO ?? "PalantiriCammus/PaLanTiri-Consultoras";

async function vercelFetch(
  token: string,
  teamId: string | undefined,
  metodo: string,
  ruta: string,
  body?: unknown,
) {
  const url = teamId
    ? `${VERCEL_API}${ruta}${ruta.includes("?") ? "&" : "?"}teamId=${teamId}`
    : `${VERCEL_API}${ruta}`;
  const res = await fetch(url, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    /* respuesta no-JSON */
  }
  return { ok: res.ok, status: res.status, json, texto };
}

export async function crearConsultora(
  _prev: ResultadoAlta | null,
  formData: FormData,
): Promise<ResultadoAlta> {
  const perfil = await getProfile();
  if (!perfil || perfil.rol !== "super_admin") {
    return { ok: false, mensaje: "Solo un super administrador puede crear consultoras." };
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return {
      ok: false,
      mensaje:
        "Falta la variable VERCEL_TOKEN en esta instancia. Cargala en Vercel → Settings → Environment Variables (token de vercel.com/account/tokens) y redeployá.",
    };
  }
  const teamId = process.env.VERCEL_TEAM_ID || undefined;

  const nombre = val(formData, "nombre")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");
  const supabaseUrl = val(formData, "supabaseUrl").replace(/\/+$/, "");
  const anonKey = val(formData, "anonKey");
  const serviceRoleKey = val(formData, "serviceRoleKey");
  const emailFrom = val(formData, "emailFrom") || `${val(formData, "nombre")} <onboarding@resend.dev>`;

  if (!nombre || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return { ok: false, mensaje: "Completá nombre y las 3 claves de Supabase." };
  }
  if (!supabaseUrl.startsWith("https://")) {
    return { ok: false, mensaje: "La URL de Supabase debe empezar con https://" };
  }

  const siteUrl = `https://${nombre}.vercel.app`;
  const envVars: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    NEXT_PUBLIC_SITE_URL: siteUrl,
    EMAIL_FROM: emailFrom,
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  };

  // 1. Crear el proyecto (conectado al repo, root webapp)
  const crear = await vercelFetch(token, teamId, "POST", "/v11/projects", {
    name: nombre,
    framework: "nextjs",
    rootDirectory: "webapp",
    gitRepository: { type: "github", repo: REPO },
  });

  let proyectoId: string | undefined;
  let repoId: number | string | undefined;
  if (crear.ok && crear.json) {
    proyectoId = crear.json.id as string;
    repoId = (crear.json.link as { repoId?: number })?.repoId;
  } else if (crear.status === 409) {
    const got = await vercelFetch(token, teamId, "GET", `/v9/projects/${nombre}`);
    if (got.ok && got.json) {
      proyectoId = got.json.id as string;
      repoId = (got.json.link as { repoId?: number })?.repoId;
    } else {
      return { ok: false, mensaje: `No pude leer el proyecto existente: ${got.status} ${got.texto}` };
    }
  } else {
    return { ok: false, mensaje: `Error creando el proyecto en Vercel (${crear.status}): ${crear.texto}` };
  }

  // 2. Cargar las env vars
  const fallidas: string[] = [];
  for (const [key, value] of Object.entries(envVars)) {
    if (!value) continue;
    const r = await vercelFetch(token, teamId, "POST", `/v10/projects/${proyectoId}/env`, {
      key,
      value,
      type: "encrypted",
      target: ["production", "preview", "development"],
    });
    if (!r.ok && r.status !== 409) fallidas.push(`${key} (${r.status})`);
  }

  // 3. Disparar el primer deploy
  let deployMsg = "Deploy: disparalo desde Vercel o con un push a main.";
  if (repoId) {
    const dep = await vercelFetch(token, teamId, "POST", "/v13/deployments", {
      name: nombre,
      project: proyectoId,
      target: "production",
      gitSource: { type: "github", repoId, ref: "main" },
    });
    if (dep.ok) deployMsg = "Deploy disparado ✅";
  }

  // 4. Registrar la instancia en la Consola para monitorearla
  const supabase = await createClient();
  await supabase
    .from("instancias_consultoras")
    .insert({ nombre: val(formData, "nombre"), url: siteUrl, notas: "Creada desde la Consola" });

  revalidatePath("/admin/consola");

  const pendientes = [
    "Falta a mano: el cliente crea su base Supabase y corre MIGRACIONES-BUNDLE.sql + crea su usuario admin + activa CAPTCHA (Secret Key).",
    `Agregar el hostname ${nombre}.vercel.app al widget de Cloudflare Turnstile.`,
    "Google: nada (callback único).",
  ];
  const aviso = fallidas.length ? ` ⚠️ Env vars con error: ${fallidas.join(", ")}.` : "";

  return {
    ok: true,
    url: siteUrl,
    mensaje: `Proyecto ${nombre} creado en Vercel. ${deployMsg}${aviso}\n\nPendientes:\n• ${pendientes.join("\n• ")}`,
  };
}

export async function agregarInstancia(formData: FormData) {
  const supabase = await createClient();

  const url = val(formData, "url").replace(/\/+$/, "");
  if (!url.startsWith("https://")) {
    throw new Error("La URL debe empezar con https://");
  }

  const { error } = await supabase.from("instancias_consultoras").insert({
    nombre: val(formData, "nombre"),
    url,
    notas: val(formData, "notas"),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/consola");
}

export async function eliminarInstancia(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("instancias_consultoras")
    .delete()
    .eq("id", val(formData, "id"));
  if (error) throw new Error(error.message);

  revalidatePath("/admin/consola");
}
