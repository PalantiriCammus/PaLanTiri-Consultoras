"use server";

import { createClient } from "@/lib/supabase/server";
import { urlVerCv } from "@/lib/storage/cv";

export async function enviarPostulantes({
  postulante_ids,
  empresa_id,
  asunto,
  mensaje,
}: {
  postulante_ids: number[];
  empresa_id: number;
  asunto: string;
  mensaje: string;
}) {
  try {
    const supabase = await createClient();

    // Obtener datos de postulantes
    const { data: postulantes } = await supabase
      .from("postulantes")
      .select("id, nombre, apellido, email, titulo_principal, cv_path")
      .in("id", postulante_ids);

    if (!postulantes || postulantes.length === 0) {
      return { ok: false, error: "No se encontraron postulantes" };
    }

    // Obtener datos de empresa
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id, nombre, email_principal, contacto_email, email_alterno")
      .eq("id", empresa_id)
      .single();

    if (!empresa) {
      return { ok: false, error: "Empresa no encontrada" };
    }

    // Obtener URLs de CVs
    const cvUrls = await Promise.all(
      postulantes.map(async (p) => ({
        ...p,
        cvUrl: p.cv_path ? await urlVerCv(p.cv_path) : null,
      }))
    );

    // Preparar datos para envío (aquí iría la integración con Resend/email)
    // Por ahora, solo registramos que se hizo
    console.log("Presentación a enviar:", {
      empresa: empresa.nombre,
      postulantes: postulantes.map((p) => `${p.nombre} ${p.apellido}`),
      asunto,
      mensaje,
    });

    // TODO: Integrar con servicio de email (Resend)
    // La lógica sería:
    // 1. Generar HTML con datos de postulantes
    // 2. Adjuntar CVs
    // 3. Enviar email a empresa con Resend
    // 4. Registrar evento en la tabla de presentaciones

    return {
      ok: true,
      empresa_nombre: empresa.nombre,
      postulantes_enviados: postulantes.length,
    };
  } catch (error) {
    console.error("Error en enviarPostulantes:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
