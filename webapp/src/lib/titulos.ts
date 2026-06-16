// Títulos oficiales de Argentina agrupados por nivel, para el campo
// "Título requerido" de la búsqueda (multi-selección, filtrado por nivel de
// educación). Es una ayuda: se puede escribir cualquier otro que no esté.
// Ampliable según necesidad.

export const TITULOS_TERCIARIOS: string[] = [
  "Técnico Superior en Análisis de Sistemas",
  "Técnico Superior en Programación",
  "Técnico Superior en Administración de Empresas",
  "Técnico Superior en Higiene y Seguridad en el Trabajo",
  "Técnico Superior en Recursos Humanos",
  "Técnico Superior en Comercialización / Marketing",
  "Técnico Superior en Logística",
  "Técnico Superior en Comercio Exterior",
  "Técnico Superior en Gestión de las Organizaciones",
  "Técnico Superior en Turismo",
  "Técnico Superior en Hotelería",
  "Técnico Superior en Gastronomía",
  "Técnico Superior en Diseño Gráfico",
  "Técnico Superior en Diseño de Indumentaria",
  "Técnico Superior en Enfermería",
  "Técnico Superior en Radiología",
  "Técnico Superior en Laboratorio",
  "Técnico Superior en Periodismo",
  "Técnico Superior en Producción Multimedial",
  "Técnico Superior en Electrónica",
  "Técnico Superior en Electromecánica",
  "Técnico Superior en Mecánica Automotriz",
  "Técnico Superior en Mantenimiento Industrial",
  "Técnico Superior en Bromatología",
  "Técnico Superior en Gestión Ambiental",
  "Profesor/a de Educación Inicial",
  "Profesor/a de Educación Primaria",
  "Profesor/a de Educación Secundaria",
  "Tecnicatura en Secretariado Ejecutivo",
  "Tecnicatura en Acompañamiento Terapéutico",
];

export const TITULOS_UNIVERSITARIOS: string[] = [
  "Contador/a Público/a",
  "Licenciado/a en Administración de Empresas",
  "Licenciado/a en Economía",
  "Licenciado/a en Finanzas",
  "Licenciado/a en Comercialización / Marketing",
  "Licenciado/a en Recursos Humanos / Relaciones del Trabajo",
  "Licenciado/a en Sistemas / Informática",
  "Ingeniero/a en Sistemas de Información",
  "Ingeniero/a Informático/a",
  "Ingeniero/a Industrial",
  "Ingeniero/a Civil",
  "Ingeniero/a Mecánico/a",
  "Ingeniero/a Electrónico/a",
  "Ingeniero/a Electricista",
  "Ingeniero/a Químico/a",
  "Ingeniero/a en Alimentos",
  "Ingeniero/a Agrónomo/a",
  "Abogado/a",
  "Escribano/a",
  "Licenciado/a en Psicología",
  "Licenciado/a en Relaciones Públicas",
  "Licenciado/a en Comunicación Social",
  "Licenciado/a en Publicidad",
  "Licenciado/a en Comercio Exterior",
  "Licenciado/a en Ciencias Políticas",
  "Licenciado/a en Relaciones Internacionales",
  "Licenciado/a en Trabajo Social",
  "Licenciado/a en Nutrición",
  "Médico/a",
  "Licenciado/a en Enfermería",
  "Licenciado/a en Kinesiología y Fisiatría",
  "Bioquímico/a",
  "Farmacéutico/a",
  "Odontólogo/a",
  "Arquitecto/a",
  "Licenciado/a en Diseño Gráfico",
  "Licenciado/a en Administración Pública",
  "Licenciado/a en Gestión de Recursos Humanos",
  "Actuario/a",
  "Traductor/a Público/a",
  "Licenciado/a en Turismo",
  "Licenciado/a en Logística",
];

export const TITULOS_POSGRADO: string[] = [
  "MBA — Maestría en Administración de Empresas",
  "Maestría en Dirección de Empresas",
  "Maestría en Finanzas",
  "Maestría en Marketing",
  "Maestría en Recursos Humanos",
  "Maestría en Data Science / Ciencia de Datos",
  "Maestría en Dirección de Proyectos",
  "Especialización en Tributación / Impuestos",
  "Especialización en Finanzas",
  "Especialización en Recursos Humanos",
  "Especialización en Seguridad e Higiene",
  "Especialización en Comercio Exterior",
  "Especialización en Marketing Digital",
  "Posgrado en Dirección Estratégica",
  "Doctorado",
];

// Catálogo agrupado (para el Index clickeable de titulaciones del postulante).
export const CATALOGO_TITULOS: { grupo: string; skills: string[] }[] = [
  { grupo: "Terciarios", skills: TITULOS_TERCIARIOS },
  { grupo: "Universitarios", skills: TITULOS_UNIVERSITARIOS },
  { grupo: "Posgrados / Maestrías", skills: TITULOS_POSGRADO },
];

// Devuelve la lista de títulos según el nivel de educación elegido.
export function titulosPorEducacion(educacion: string): string[] {
  const e = educacion.toLowerCase();
  if (e.includes("terciario")) return TITULOS_TERCIARIOS;
  if (e.includes("universitario")) return TITULOS_UNIVERSITARIOS;
  if (e.includes("posgrado") || e.includes("maestr")) return TITULOS_POSGRADO;
  return [];
}
