"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function responderAsignacion(formData: FormData) {
  const supabase = await createClient();

  const id = (formData.get("id") as string) ?? "";
  const accion = (formData.get("accion") as string) ?? "";

  const data: Record<string, unknown> =
    accion === "aceptar"
      ? { estado: "aceptada", fecha_aceptacion: new Date().toISOString() }
      : { estado: "rechazada", fecha_rechazo: new Date().toISOString() };

  const { error } = await supabase.from("asignaciones_busqueda").update(data).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/portal/busquedas");
}
