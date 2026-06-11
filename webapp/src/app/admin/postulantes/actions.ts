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

export async function guardarPostulante(formData: FormData) {
  const supabase = await createClient();

  const id = val(formData, "id");

  const data = {
    nombre: val(formData, "nombre"),
    apellido: val(formData, "apellido"),
    email: val(formData, "email"),
    telefono: val(formData, "telefono"),
    fecha_nacimiento: nullable(formData, "fecha_nacimiento"),
    genero: nullable(formData, "genero"),
    pais: val(formData, "pais") || "Argentina",
    provincia: val(formData, "provincia"),
    ciudad: val(formData, "ciudad"),
    disponibilidad_mudanza: formData.get("disponibilidad_mudanza") === "on",
    titulo_principal: val(formData, "titulo_principal"),
    resumen_profesional: val(formData, "resumen_profesional"),
    experiencia_anos: Number(val(formData, "experiencia_anos") || "0"),
    habilidades: val(formData, "habilidades"),
    idiomas: val(formData, "idiomas"),
    salario_pretendido_minimo: nullableNum(formData, "salario_pretendido_minimo"),
    salario_pretendido_maximo: nullableNum(formData, "salario_pretendido_maximo"),
    acepta_remoto: formData.get("acepta_remoto") === "on",
    acepta_hibrido: formData.get("acepta_hibrido") === "on",
    acepta_presencial: formData.get("acepta_presencial") === "on",
    linkedin_url: nullable(formData, "linkedin_url"),
    portfolio_url: nullable(formData, "portfolio_url"),
    github_url: nullable(formData, "github_url"),
    estado_id: nullableNum(formData, "estado_id"),
    selector_id: nullableNum(formData, "selector_id"),
    guardado_en_pool: formData.get("guardado_en_pool") === "on",
  };

  if (id) {
    const { error } = await supabase.from("postulantes").update(data).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("postulantes").insert(data);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/postulantes");
  redirect("/admin/postulantes");
}

export async function eliminarPostulante(formData: FormData) {
  const supabase = await createClient();
  const id = val(formData, "id");

  const { error } = await supabase.from("postulantes").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/postulantes");
}
