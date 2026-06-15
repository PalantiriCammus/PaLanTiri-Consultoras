-- ------------------------------------------------------------
-- 0009 — Títulos requeridos en la búsqueda
-- ------------------------------------------------------------
-- Campo de texto (lista separada por comas) con los títulos oficiales que
-- requiere la búsqueda. Permite multi-selección (ej. "Contador Público,
-- Lic. en Administración, Lic. en Economía" para Gerente de Adm. y Finanzas).
-- Sirve también para enriquecer la base de talentos y futuros matchings.
-- ------------------------------------------------------------

alter table public.perfiles_busqueda
  add column if not exists titulos_requeridos text not null default '';
