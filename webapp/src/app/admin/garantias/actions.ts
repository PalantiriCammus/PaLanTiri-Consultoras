"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function val(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function nullable(formData: FormData, key: string): string | null {
  const v = val(formData, key);
  return v === "" ? null : v;
}

export async function actualizarGarantia(formData: FormData) {
  const supabase = await createClient();

  const id = val(formData, "id");

  const data = {
    estado: val(formData, "estado"),
    fecha_fin_real: nullable(formData, "fecha_fin_real"),
    motivo_incumplimiento: nullable(formData, "motivo_incumplimiento"),
    notas: val(formData, "notas"),
  };

  const { error } = await supabase.from("seguimiento_garantia").update(data).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/garantias");
}
