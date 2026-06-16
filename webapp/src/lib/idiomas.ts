// Idiomas agrupados para selección múltiple en postulantes
export const IDIOMAS_COMUNES: string[] = [
  "Inglés",
  "Portugués",
  "Francés",
  "Alemán",
  "Italiano",
  "Chino",
  "Japonés",
  "Coreano",
  "Árabe",
  "Ruso",
  "Holandés",
  "Sueco",
  "Noruego",
  "Danés",
  "Finlandés",
  "Polaco",
  "Turco",
  "Hebreo",
  "Tailandés",
  "Vietnamita",
];

export const CATALOGO_IDIOMAS: { grupo: string; skills: string[] }[] = [
  { grupo: "Principales", skills: IDIOMAS_COMUNES.slice(0, 5) },
  { grupo: "Otros idiomas", skills: IDIOMAS_COMUNES.slice(5) },
];
