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
    banco: val(formData, "banco"),
    numero_cuenta: val(formData, "numero_cuenta"),
    cbu: val(formData, "cbu"),
    alias_cvu: val(formData, "alias_cvu"),
    comision_porcentaje_defecto: Number(val(formData, "comision_porcentaje_defecto") || "50"),
  };

  if (id) {
    const profileId = nullable(formData, "profile_id");
    const { error } = await supabase
      .from("selectores")
      .update({ ...data, profile_id: profileId })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data: nuevo, error } = await supabase
      .from("selectores")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await invitarUsuarioSelector(nuevo.id, data.email, data.nombre, data.apellido);
  }

  revalidatePath("/admin/selectores");
  redirect("/admin/selectores");
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
