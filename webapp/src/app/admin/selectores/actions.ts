"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function val(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function nullable(formData: FormData, key: string): string | null {
  const v = val(formData, key);
  return v === "" ? null : v;
}

export async function guardarSelector(formData: FormData) {
  const supabase = await createClient();

  const id = val(formData, "id");

  const data = {
    nombre: val(formData, "nombre"),
    apellido: val(formData, "apellido"),
    email: val(formData, "email"),
    telefono: val(formData, "telefono"),
    especializacion: val(formData, "especializacion") || "general",
    experiencia_anos: Number(val(formData, "experiencia_anos") || "0"),
    descripcion_perfil: val(formData, "descripcion_perfil"),
    pais: val(formData, "pais") || "Argentina",
    provincia: val(formData, "provincia"),
    ciudad: val(formData, "ciudad"),
    estado: val(formData, "estado") || "activo",
    cuit: val(formData, "cuit"),
    dni: nullable(formData, "dni"),
    entidad_pago: val(formData, "entidad_pago"),
    datos_cuenta: val(formData, "datos_cuenta"),
    cbu_cvu_alias: val(formData, "cbu_cvu_alias"),
    usuario_billetera: val(formData, "usuario_billetera"),
    comision_porcentaje_defecto: Number(val(formData, "comision_porcentaje_defecto") || "50"),
  };

  if (id) {
    const profileId = nullable(formData, "profile_id");
    const { error } = await supabase
      .from("selectores")
      .update({ ...data, profile_id: profileId })
      .eq("id", id);
    if (error) throw new Error(error.message);

    await sincronizarGrupos(supabase, Number(id), val(formData, "grupos"));
  } else {
    const { data: nuevo, error } = await supabase
      .from("selectores")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await sincronizarGrupos(supabase, nuevo.id, val(formData, "grupos"));
    await invitarUsuarioSelector(nuevo.id, data.email, data.nombre, data.apellido);
  }

  revalidatePath("/admin/selectores");
  redirect("/admin/selectores");
}

// Sincroniza la pertenencia del selector a los grupos elegidos (lista de
// nombres separada por coma). Crea los grupos que no existan y reconcilia
// la tabla puente selector_grupos (borra los que ya no están, agrega los nuevos).
async function sincronizarGrupos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  selectorId: number,
  nombresCsv: string
) {
  const nombres = Array.from(
    new Set(
      nombresCsv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );

  const ids: number[] = [];
  for (const nombre of nombres) {
    const { data: grupo } = await supabase
      .from("grupos_selector")
      .upsert({ nombre }, { onConflict: "nombre" })
      .select("id")
      .single();
    if (grupo) ids.push(grupo.id);
  }

  // Reconciliar: limpiar pertenencias previas y volver a insertar el set actual.
  await supabase.from("selector_grupos").delete().eq("selector_id", selectorId);
  if (ids.length > 0) {
    await supabase
      .from("selector_grupos")
      .insert(ids.map((grupo_id) => ({ selector_id: selectorId, grupo_id })));
  }
}

// Crea (o reutiliza) la cuenta de usuario asociada a un selector recién
// creado y le envía un email de invitación para que defina su contraseña.
async function invitarUsuarioSelector(
  selectorId: number,
  email: string,
  nombre: string,
  apellido: string
) {
  if (!email) return;

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const redirectTo = siteUrl ? `${siteUrl}/set-password` : undefined;

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nombre, apellido },
    redirectTo,
  });

  if (!error && invited.user) {
    await admin.from("selectores").update({ profile_id: invited.user.id }).eq("id", selectorId);
    return;
  }

  // Si el usuario ya existía, vincularlo igual buscando su perfil por email
  if (error) {
    const { data: existente } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existente) {
      await admin.from("selectores").update({ profile_id: existente.id }).eq("id", selectorId);
    }
  }
}

export async function eliminarSelector(formData: FormData) {
  const supabase = await createClient();
  const id = val(formData, "id");

  const { error } = await supabase.from("selectores").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/selectores");
}
