"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function val(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

export async function crearUsuario(formData: FormData) {
  const admin = createAdminClient();

  const email = val(formData, "email");
  const password = val(formData, "password");
  const nombre = val(formData, "nombre");
  const apellido = val(formData, "apellido");
  const rol = val(formData, "rol") || "selector";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, apellido },
  });
  if (error) throw new Error(error.message);

  const { error: errorPerfil } = await admin
    .from("profiles")
    .update({ nombre, apellido, rol })
    .eq("id", data.user.id);
  if (errorPerfil) throw new Error(errorPerfil.message);

  // Si es selector, vincular automáticamente con un registro de selectores por email
  if (rol === "selector") {
    await admin.from("selectores").update({ profile_id: data.user.id }).eq("email", email);
  }

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

export async function actualizarUsuario(formData: FormData) {
  const supabase = await createClient();

  const id = val(formData, "id");
  const data = {
    nombre: val(formData, "nombre"),
    apellido: val(formData, "apellido"),
    telefono: val(formData, "telefono"),
    rol: val(formData, "rol"),
    activo: formData.get("activo") === "on",
  };

  const { error } = await supabase.from("profiles").update(data).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/usuarios");
}

export async function eliminarUsuario(formData: FormData) {
  const admin = createAdminClient();
  const id = val(formData, "id");

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/usuarios");
}
