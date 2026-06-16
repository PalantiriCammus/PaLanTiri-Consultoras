-- ============================================================
-- Migración 0011: Idiomas requeridos en la búsqueda
-- ------------------------------------------------------------
--  perfiles_busqueda.idiomas_requeridos: idiomas que pide la búsqueda
--  (multi-selección por desplegable, separado por comas).
-- Idempotente.
-- ============================================================

alter table public.perfiles_busqueda
  add column if not exists idiomas_requeridos text not null default '';
