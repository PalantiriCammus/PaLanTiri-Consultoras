"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function val(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
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
