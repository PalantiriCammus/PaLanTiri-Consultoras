-- ============================================================
-- Migración 0012: Renombrar datos de pago de comisión del selector
-- Alinea los nombres internos con la nueva nomenclatura del formulario:
--   banco         -> entidad_pago
--   numero_cuenta -> datos_cuenta
--   cbu           -> cbu_cvu_alias   (además se ensancha a text: ya no es solo CBU)
--   alias_cvu     -> usuario_billetera
-- Idempotente: solo renombra si la columna vieja todavía existe, así que
-- se puede correr varias veces sin error. Correr en CADA base existente.
-- ============================================================

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'selectores'
               and column_name = 'banco') then
    alter table public.selectores rename column banco to entidad_pago;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'selectores'
               and column_name = 'numero_cuenta') then
    alter table public.selectores rename column numero_cuenta to datos_cuenta;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'selectores'
               and column_name = 'cbu') then
    alter table public.selectores rename column cbu to cbu_cvu_alias;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'selectores'
               and column_name = 'alias_cvu') then
    alter table public.selectores rename column alias_cvu to usuario_billetera;
  end if;
end $$;

-- El campo CBU/CVU/ALIAS ahora puede contener un alias (no solo 22 dígitos):
-- ensanchar de varchar(22) a text si todavía no lo es. Idempotente.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'selectores'
               and column_name = 'cbu_cvu_alias' and data_type <> 'text') then
    alter table public.selectores alter column cbu_cvu_alias type text;
  end if;
end $$;
