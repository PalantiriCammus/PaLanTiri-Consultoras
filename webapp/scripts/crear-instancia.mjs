#!/usr/bin/env node
// ============================================================
// Alta automática de una instancia (consultora) en Vercel.
//
// Crea el proyecto en Vercel conectado al repo, con Root Directory = webapp,
// le carga TODAS las env vars y dispara el primer deploy. La base Supabase
// la crea aparte el cliente (su cuenta) y vos completás sus 3 claves acá.
//
// USO:
//   1. Copiá  scripts/nueva-instancia.local.json.example
//      a      scripts/nueva-instancia.local.json   y completalo.
//   2. Sacá un token en https://vercel.com/account/tokens
//      y exportalo:  $env:VERCEL_TOKEN="xxxxx"   (PowerShell)
//   3. node scripts/crear-instancia.mjs                 (usa nueva-instancia.local.json)
//      node scripts/crear-instancia.mjs --dry-run       (solo muestra, no crea nada)
//      node scripts/crear-instancia.mjs otra-config.json
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.vercel.com";
const aquí = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const configPath =
  args.find((a) => !a.startsWith("--")) ?? path.join(aquí, "nueva-instancia.local.json");

function morir(msg) {
  console.error("\n❌ " + msg + "\n");
  process.exit(1);
}

// --- Leer configuración -------------------------------------------------
if (!fs.existsSync(configPath)) {
  morir(`No encuentro el archivo de config: ${configPath}\n   Copiá nueva-instancia.local.json.example y completalo.`);
}
let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (e) {
  morir(`El config no es JSON válido: ${e.message}`);
}

const token = process.env.VERCEL_TOKEN || cfg.vercelToken;
if (!token) morir("Falta el token de Vercel. Exportá VERCEL_TOKEN o ponelo en el config (vercelToken).");

const repo = cfg.repo || "manuelcammus/PaLanTiri-Consultoras";
const teamId = cfg.teamId || null; // opcional, si los proyectos viven en un team
const c = cfg.consultora || {};
const compartidas = cfg.compartidas || {};

for (const campo of ["nombre", "supabaseUrl", "anonKey", "serviceRoleKey"]) {
  if (!c[campo]) morir(`Falta consultora.${campo} en el config.`);
}

const nombre = c.nombre.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
const siteUrl = c.siteUrl || `https://${nombre}.vercel.app`;

// Env vars que va a tener la instancia
const envVars = {
  NEXT_PUBLIC_SUPABASE_URL: c.supabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: c.anonKey,
  SUPABASE_SERVICE_ROLE_KEY: c.serviceRoleKey,
  NEXT_PUBLIC_SITE_URL: siteUrl,
  EMAIL_FROM: c.emailFrom || `${c.nombre} <onboarding@resend.dev>`,
  RESEND_API_KEY: compartidas.RESEND_API_KEY || "",
  GOOGLE_CLIENT_ID: compartidas.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: compartidas.GOOGLE_CLIENT_SECRET || "",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: compartidas.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
};
// (GOOGLE_CALLBACK_URL no hace falta: el código usa el callback central por defecto)

async function vercel(metodo, ruta, body) {
  const url = teamId
    ? `${API}${ruta}${ruta.includes("?") ? "&" : "?"}teamId=${teamId}`
    : `${API}${ruta}`;
  const res = await fetch(url, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* texto plano */ }
  return { ok: res.ok, status: res.status, json, texto };
}

console.log(`\n🚀 Alta de instancia: ${nombre}`);
console.log(`   Repo:     ${repo}`);
console.log(`   Site URL: ${siteUrl}`);
console.log(`   Vars:     ${Object.keys(envVars).join(", ")}`);
const faltantes = Object.entries(envVars).filter(([, v]) => !v).map(([k]) => k);
if (faltantes.length) console.log(`   ⚠️  Vacías (revisá compartidas): ${faltantes.join(", ")}`);

if (dryRun) {
  console.log("\n(dry-run) No se creó nada. Quitá --dry-run para ejecutar.\n");
  process.exit(0);
}

// --- 1. Crear el proyecto ----------------------------------------------
console.log("\n1/3 Creando el proyecto en Vercel…");
const crear = await vercel("POST", "/v11/projects", {
  name: nombre,
  framework: "nextjs",
  rootDirectory: "webapp",
  gitRepository: { type: "github", repo },
});

let proyectoId, repoId;
if (crear.ok) {
  proyectoId = crear.json.id;
  repoId = crear.json.link?.repoId;
  console.log(`   ✔️ Proyecto creado (id ${proyectoId}).`);
} else if (crear.status === 409) {
  console.log("   ℹ️ El proyecto ya existía, sigo con las env vars.");
  const got = await vercel("GET", `/v9/projects/${nombre}`);
  if (got.ok) { proyectoId = got.json.id; repoId = got.json.link?.repoId; }
  else morir(`No pude leer el proyecto existente: ${got.status} ${got.texto}`);
} else {
  morir(`Error creando el proyecto: ${crear.status}\n${crear.texto}`);
}

// --- 2. Cargar las env vars --------------------------------------------
console.log("2/3 Cargando env vars…");
for (const [key, value] of Object.entries(envVars)) {
  if (!value) { console.log(`   • ${key}: (vacía, salteada)`); continue; }
  const r = await vercel("POST", `/v10/projects/${proyectoId}/env`, {
    key, value, type: "encrypted", target: ["production", "preview", "development"],
  });
  if (r.ok) console.log(`   ✔️ ${key}`);
  else if (r.status === 409) console.log(`   ↻ ${key} (ya existía, no se pisó)`);
  else console.log(`   ⚠️ ${key}: ${r.status} ${r.texto}`);
}

// --- 3. Disparar el primer deploy --------------------------------------
console.log("3/3 Disparando el primer deploy…");
if (repoId) {
  const dep = await vercel("POST", "/v13/deployments", {
    name: nombre,
    project: proyectoId,
    target: "production",
    gitSource: { type: "github", repoId, ref: "main" },
  });
  if (dep.ok) console.log(`   ✔️ Deploy iniciado: https://${dep.json.url || nombre + ".vercel.app"}`);
  else console.log(`   ⚠️ No pude disparar el deploy (${dep.status}). Hacelo desde el dashboard o con un push a main.\n${dep.texto}`);
} else {
  console.log("   ⚠️ Sin repoId; entrá al proyecto en Vercel y tocá Deploy (o pusheá a main).");
}

console.log(`\n✅ Instancia ${nombre} preparada.\n`);
console.log("Pasos que QUEDAN a mano (no se automatizan):");
console.log("  • Supabase: el cliente crea su base y corre webapp/supabase/MIGRACIONES-BUNDLE.sql");
console.log("  • Supabase: crear usuario admin del cliente + CAPTCHA (Attack Protection)");
console.log(`  • Cloudflare Turnstile: agregar el hostname ${nombre}.vercel.app al widget`);
console.log("  • Google: NADA (callback único ya configurado) 🎉");
console.log(`  • Registrar la instancia en la Consola Palantiri (URL ${siteUrl})\n`);
