-- ============================================================
-- Migración 0010: Nuevo flujo de estados de postulación (10 etapas)
-- Cambia el enum a text, actualiza el default, y reemplaza la
-- máquina de estados (trigger) y las fechas automáticas para que
-- usen la nueva nomenclatura.
--
-- Estados nuevos:
--   1. presentado_selector
--   2. en_evaluacion
--   3. para_enviar_empresa
--   4. enviado_empresa
--   5. entrevistado_empresa
--   6. rechazado_empresa
--   7. rechazado_postulante
--   8. oferta_laboral
--   9. contratado
--  10. cancelada
-- ============================================================

-- 1. Columna a text (flexible, sin enum rígido)
alter table public.postulaciones
  alter column estado type text;

-- 2. Nuevo estado inicial por defecto
alter table public.postulaciones
  alter column estado set default 'presentado_selector';

-- 3. Máquina de estados + fechas automáticas con la nueva nomenclatura.
--    Los selectores (no-staff) respetan el flujo; el staff corrige libre.
create or replace function public.postulacion_before_update()
returns trigger
language plpgsql
as $$
declare
  transicion_valida boolean;
begin
  if new.estado is distinct from old.estado then
    if not public.is_staff() and auth.uid() is not null then
      transicion_valida := case old.estado
        when 'presentado_selector' then new.estado in ('en_evaluacion', 'cancelada')
        when 'en_evaluacion' then new.estado in ('para_enviar_empresa', 'rechazado_postulante', 'cancelada')
        when 'para_enviar_empresa' then new.estado in ('enviado_empresa', 'cancelada')
        when 'enviado_empresa' then new.estado in ('entrevistado_empresa', 'rechazado_empresa', 'cancelada')
        when 'entrevistado_empresa' then new.estado in ('oferta_laboral', 'rechazado_empresa', 'rechazado_postulante', 'cancelada')
        when 'oferta_laboral' then new.estado in ('contratado', 'rechazado_postulante', 'cancelada')
        else false
      end;
      if not transicion_valida then
        raise exception 'Transición de estado inválida: % → %', old.estado, new.estado;
      end if;
    end if;

    case new.estado
      when 'enviado_empresa' then new.fecha_recepcion_empresa := now();
      when 'entrevistado_empresa' then new.fecha_primera_entrevista := now();
      when 'oferta_laboral' then new.fecha_oferta := now();
      when 'contratado' then new.fecha_aceptacion_postulante := now(); new.fecha_cierre := now();
      when 'rechazado_empresa' then new.fecha_cierre := now();
      when 'rechazado_postulante' then new.fecha_cierre := now();
      when 'cancelada' then new.fecha_cierre := now();
      else null;
    end case;
  end if;
  return new;
end;
$$;

-- 4. Migrar datos existentes de la nomenclatura vieja a la nueva (idempotente).
update public.postulaciones set estado = 'presentado_selector' where estado = 'enviada';
update public.postulaciones set estado = 'enviado_empresa' where estado = 'recibida';
update public.postulaciones set estado = 'entrevistado_empresa' where estado = 'entrevista';
update public.postulaciones set estado = 'oferta_laboral' where estado = 'oferta';
update public.postulaciones set estado = 'para_enviar_empresa' where estado = 'aceptada_postulante';
update public.postulaciones set estado = 'rechazado_empresa' where estado = 'rechazada_empresa';
update public.postulaciones set estado = 'rechazado_postulante' where estado = 'rechazada_postulante';
