"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function val(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function nullable(formData: FormData, key: string): string | null {
  const v = val(formData, key);
  return v === "" ? null : v;
}

export async function guardarEmpresa(formData: FormData) {
  const supabase = await createClient();

  const id = val(formData, "id");

  const data = {
    nombre: val(formData, "nombre"),
    razon_social: nullable(formData, "razon_social"),
    tipo_empresa: val(formData, "tipo_empresa") || "privada",
    rubro_id: nullable(formData, "rubro_id"),
    email_principal: val(formData, "email_principal"),
    email_alterno: nullable(formData, "email_alterno"),
    telefono: val(formData, "telefono"),
    website: nullable(formData, "website"),
    pais: val(formData, "pais") || "Argentina",
    provincia: val(formData, "provincia"),
    ciudad: val(formData, "ciudad"),
    direccion: val(formData, "direccion"),
    contacto_nombre: val(formData, "contacto_nombre"),
    contacto_email: val(formData, "contacto_email"),
    contacto_telefono: val(formData, "contacto_telefono"),
    contacto_puesto: val(formData, "contacto_puesto"),
    modalidad_contratacion: val(formData, "modalidad_contratacion") || "a_riesgo",
    garantia: val(formData, "garantia") || "con_garantia",
    comision_porcentaje: Number(val(formData, "comision_porcentaje") || "20"),
    activa: formData.get("activa") === "on",
  };

  if (id) {
    const { error } = await supabase.from("empresas").update(data).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("empresas").insert(data);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/empresas");
  redirect("/admin/empresas");
}

export async function eliminarEmpresa(formData: FormData) {
  const supabase = await createClient();
  const id = val(formData, "id");

  const { error } = await supabase.from("empresas").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/empresas");
}
