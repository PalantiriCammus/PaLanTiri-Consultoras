-- ============================================================
-- Migración 0007: Registro de instancias (consola madre)
--   Solo se usa en la instancia de Palantiri: lista de las
--   consultoras clientes desplegadas, para monitorearlas
--   desde /admin/consola. Visible solo para super_admin.
-- ============================================================

create table public.instancias_consultoras (
  id bigint generated always as identity primary key,
  nombre text not null,
  url text not null, -- https://dominio-de-la-consultora.com (sin barra final)
  notas text not null default '',
  fecha_alta timestamptz not null default now()
);

alter table public.instancias_consultoras enable row level security;

create policy "instancias: solo super admin" on public.instancias_consultoras
  for all using (public.is_super_admin()) with check (public.is_super_admin());
