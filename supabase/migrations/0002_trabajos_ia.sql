-- LexVE · Trabajos de IA en segundo plano
-- Los análisis con Claude pueden tardar varios minutos. En Netlify las funciones normales
-- se cortan a los 10 s, así que la app crea un "trabajo", lo procesa una función en segundo
-- plano (hasta 15 min) y la pantalla consulta su estado hasta que termina.
-- Migración solo aditiva: no modifica tablas existentes.

create table if not exists legal.trabajos_ia (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('analisis', 'busqueda_tsj', 'importar_tsj')),
  parametros jsonb not null default '{}'::jsonb,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'procesando', 'completado', 'error')),
  resultado jsonb,
  error text,
  creado_por uuid not null references legal.perfiles(id) on delete cascade,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists trabajos_ia_usuario_idx on legal.trabajos_ia(creado_por, creado_en desc);

drop trigger if exists trabajos_ia_actualizado on legal.trabajos_ia;
create trigger trabajos_ia_actualizado before update on legal.trabajos_ia
for each row execute function legal.tg_actualizado();

alter table legal.trabajos_ia enable row level security;

-- Cada usuario crea y consulta solo sus propios trabajos.
-- El procesamiento lo hace el servidor con service_role (no pasa por RLS).
drop policy if exists trabajos_ver on legal.trabajos_ia;
create policy trabajos_ver on legal.trabajos_ia for select to authenticated
  using (creado_por = (select auth.uid()));
drop policy if exists trabajos_crear on legal.trabajos_ia;
create policy trabajos_crear on legal.trabajos_ia for insert to authenticated
  with check (creado_por = (select auth.uid()) and estado = 'pendiente');

grant select, insert on legal.trabajos_ia to authenticated;
grant all on legal.trabajos_ia to service_role;
