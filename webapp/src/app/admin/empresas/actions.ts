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

function nullableNum(formData: FormData, key: string): number | null {
  const v = val(formData, key);
  return v === "" ? null : Number(v);
}

export async function guardarEmpresa(formData: FormData) {
  const supabase = await createClient();

  const id = val(formData, "id");

  // Rubro: si se escribió uno nuevo, se crea (o reutiliza) en la tabla rubros.
  let rubroId: string | number | null = nullable(formData, "rubro_id");
  const nuevoRubro = val(formData, "nuevo_rubro");
  if (nuevoRubro) {
    const { data: r } = await supabase
      .from("rubros")
      .upsert({ nombre: nuevoRubro }, { onConflict: "nombre" })
      .select("id")
      .single();
    if (r) rubroId = r.id;
  }

  const data = {
    nombre: val(formData, "nombre"),
    razon_social: nullable(formData, "razon_social"),
    tipo_empresa: val(formData, "tipo_empresa") || "privada",
    rubro_id: rubroId,
    email_principal: val(formData, "email_principal"),
    email_alterno: nullable(formData, "email_alterno"),
    telefono: val(formData, "telefono"),
    website: nullable(formData, "website"),
    pais: val(formData, "pais") || "Argentina",
    provincia: val(formData, "provincia"),
    ciudad: val(formData, "ciudad"),
    direccion: val(formData, "direccion"),
    codigo_postal: nullable(formData, "codigo_postal"),
    contacto_nombre: val(formData, "contacto_nombre"),
    contacto_email: val(formData, "contacto_email"),
    contacto_telefono: val(formData, "contacto_telefono"),
    contacto_puesto: val(formData, "contacto_puesto"),
    contacto_comercial_nombre: nullable(formData, "contacto_comercial_nombre"),
    contacto_comercial_cargo: nullable(formData, "contacto_comercial_cargo"),
    contacto_comercial_telefono: nullable(formData, "contacto_comercial_telefono"),
    contacto_comercial_email: nullable(formData, "contacto_comercial_email"),
    modalidad_contratacion: val(formData, "modalidad_contratacion") || "a_riesgo",
    garantia: val(formData, "garantia") || "con_garantia",
    comision_porcentaje: Number(val(formData, "comision_porcentaje") || "20"),
    salario_promedio_ofrecido: nullableNum(formData, "salario_promedio_ofrecido"),
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
