-- =====================================================================
-- LexVE · Backoffice para abogados venezolanos
-- Esquema "legal" (aislado del resto de tablas del proyecto Supabase)
-- =====================================================================
create schema if not exists legal;
create extension if not exists pg_trgm with schema extensions;

-- ---------- Tipos ----------
create type legal.rol_usuario as enum ('admin','socio','abogado','asistente');
create type legal.tipo_persona as enum ('natural','juridica');
create type legal.materia as enum ('civil','mercantil','penal','laboral','familia','lopnna','contencioso_administrativo','constitucional','tributario','agrario','transito','maritimo','otro');
create type legal.estado_caso as enum ('prospecto','abierto','en_tramite','en_sentencia','apelacion','casacion','ejecucion','cerrado','archivado');
create type legal.rol_en_caso as enum ('responsable','colaborador','consultor','pasante');
create type legal.tipo_actuacion as enum ('escrito','diligencia','audiencia','auto','sentencia','notificacion','citacion','prueba','reunion_cliente','nota','llamada','otro');
create type legal.tipo_plazo as enum ('lapso_procesal','audiencia','vencimiento_recurso','prescripcion','reunion','pago','otro');
create type legal.estado_factura as enum ('borrador','emitida','pagada','parcial','vencida','anulada');
create type legal.moneda as enum ('USD','VES','EUR');
create type legal.metodo_pago as enum ('transferencia','pago_movil','zelle','efectivo','binance','punto_venta','otro');
create type legal.sala_tsj as enum ('constitucional','politico_administrativa','electoral','casacion_civil','casacion_penal','casacion_social','plena');
create type legal.estado_correo as enum ('pendiente','enviado','simulado','error');

-- ---------- Tablas ----------
create table legal.despachos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rif text,
  direccion text,
  telefono text,
  email text,
  logo_url text,
  iva_porcentaje numeric(5,2) not null default 16,
  moneda_base legal.moneda not null default 'USD',
  creado_en timestamptz not null default now()
);

create table legal.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  despacho_id uuid not null references legal.despachos(id) on delete cascade,
  nombre text not null,
  email text not null,
  rol legal.rol_usuario not null default 'abogado',
  inpreabogado text,                -- N.º de Inpreabogado
  cedula text,
  telefono text,
  tarifa_hora numeric(12,2) default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create index on legal.perfiles(despacho_id);

create table legal.clientes (
  id uuid primary key default gen_random_uuid(),
  despacho_id uuid not null references legal.despachos(id) on delete cascade,
  tipo legal.tipo_persona not null default 'natural',
  nombre text not null,
  cedula_rif text,                  -- V-12345678 / J-12345678-9
  email text,
  telefono text,
  direccion text,
  ciudad text,
  estado_region text,
  drive_folder_id text,             -- carpeta de Google Drive del cliente
  drive_folder_url text,
  notas text,
  creado_en timestamptz not null default now()
);
create index on legal.clientes(despacho_id);
create index clientes_nombre_trgm on legal.clientes using gin (nombre extensions.gin_trgm_ops);

create table legal.casos (
  id uuid primary key default gen_random_uuid(),
  despacho_id uuid not null references legal.despachos(id) on delete cascade,
  cliente_id uuid not null references legal.clientes(id) on delete restrict,
  codigo text not null,             -- código interno, p.ej. LEX-2026-001
  numero_expediente text,           -- expediente del tribunal (AP11-V-2025-000123)
  titulo text not null,
  materia legal.materia not null default 'civil',
  estado legal.estado_caso not null default 'abierto',
  etapa text,
  tribunal text,
  circunscripcion text,
  juez text,
  contraparte text,
  abogado_contraparte text,
  descripcion text,
  cuantia numeric(16,2),
  moneda legal.moneda default 'USD',
  prioridad smallint not null default 2 check (prioridad between 1 and 3), -- 1 alta, 3 baja
  fecha_inicio date not null default current_date,
  fecha_cierre date,
  drive_folder_id text,
  drive_folder_url text,
  tarifa_tipo text not null default 'por_hora' check (tarifa_tipo in ('por_hora','fija','cuota_litis','iguala')),
  tarifa_monto numeric(12,2),
  creado_por uuid references legal.perfiles(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (despacho_id, codigo)
);
create index on legal.casos(despacho_id);
create index on legal.casos(cliente_id);
create index casos_titulo_trgm on legal.casos using gin (titulo extensions.gin_trgm_ops);

create table legal.caso_abogados (
  caso_id uuid not null references legal.casos(id) on delete cascade,
  abogado_id uuid not null references legal.perfiles(id) on delete cascade,
  rol legal.rol_en_caso not null default 'colaborador',
  asignado_en timestamptz not null default now(),
  primary key (caso_id, abogado_id)
);
create index on legal.caso_abogados(abogado_id);

create table legal.actuaciones (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references legal.casos(id) on delete cascade,
  fecha timestamptz not null default now(),
  tipo legal.tipo_actuacion not null default 'nota',
  titulo text not null,
  descripcion text,
  autor_id uuid references legal.perfiles(id),
  creado_en timestamptz not null default now()
);
create index on legal.actuaciones(caso_id, fecha desc);

create table legal.plazos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references legal.casos(id) on delete cascade,
  titulo text not null,
  descripcion text,
  tipo legal.tipo_plazo not null default 'lapso_procesal',
  fecha_vencimiento timestamptz not null,
  dias_aviso int[] not null default '{7,3,1}',
  responsable_id uuid references legal.perfiles(id),
  completado boolean not null default false,
  completado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index on legal.plazos(caso_id);
create index on legal.plazos(fecha_vencimiento) where not completado;

create table legal.documentos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references legal.casos(id) on delete cascade,
  nombre text not null,
  tipo text,                        -- demanda, contestación, poder, contrato, prueba, sentencia...
  mime_type text,
  origen text not null default 'drive' check (origen in ('drive','storage','url','texto')),
  drive_file_id text,
  url text,
  contenido_texto text,             -- texto extraído para IA y búsqueda
  resumen_ia text,
  subido_por uuid references legal.perfiles(id),
  creado_en timestamptz not null default now()
);
create index on legal.documentos(caso_id);

create table legal.sentencias (
  id uuid primary key default gen_random_uuid(),
  sala legal.sala_tsj not null,
  numero text,                      -- N.º de sentencia
  expediente text,
  fecha date,
  ponente text,
  partes text,
  materia legal.materia,
  asunto text,
  resumen text,
  doctrina text,                    -- criterio / ratio decidendi
  url text unique,
  texto text,
  fuente text not null default 'tsj' check (fuente in ('tsj','manual','ia_busqueda')),
  creado_en timestamptz not null default now(),
  busqueda tsvector generated always as (
    to_tsvector('spanish', coalesce(asunto,'') || ' ' || coalesce(resumen,'') || ' ' || coalesce(doctrina,'') || ' ' || coalesce(partes,'') || ' ' || coalesce(ponente,''))
  ) stored
);
create index sentencias_busqueda_idx on legal.sentencias using gin (busqueda);
create index on legal.sentencias(sala, fecha desc);

create table legal.caso_sentencias (
  caso_id uuid not null references legal.casos(id) on delete cascade,
  sentencia_id uuid not null references legal.sentencias(id) on delete cascade,
  relevancia smallint default 3 check (relevancia between 1 and 5),
  nota text,
  vinculado_por uuid references legal.perfiles(id),
  creado_en timestamptz not null default now(),
  primary key (caso_id, sentencia_id)
);

create table legal.analisis_ia (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid references legal.casos(id) on delete cascade,
  documento_id uuid references legal.documentos(id) on delete cascade,
  sentencia_id uuid references legal.sentencias(id) on delete cascade,
  tipo text not null check (tipo in ('caso','documento','sentencia','estrategia','riesgo','informe','busqueda_tsj')),
  pregunta text,
  resultado text not null,
  datos jsonb,
  modelo text,
  creado_por uuid references legal.perfiles(id),
  creado_en timestamptz not null default now()
);
create index on legal.analisis_ia(caso_id, creado_en desc);

create table legal.facturas (
  id uuid primary key default gen_random_uuid(),
  despacho_id uuid not null references legal.despachos(id) on delete cascade,
  cliente_id uuid not null references legal.clientes(id),
  caso_id uuid references legal.casos(id) on delete set null,
  numero text not null,
  numero_control text,              -- N.º de control (SENIAT)
  fecha_emision date not null default current_date,
  fecha_vencimiento date,
  moneda legal.moneda not null default 'USD',
  tasa_bcv numeric(14,4),           -- tasa BCV del día para equivalente en Bs.
  subtotal numeric(14,2) not null default 0,
  iva_porcentaje numeric(5,2) not null default 16,
  iva_monto numeric(14,2) not null default 0,
  igtf_monto numeric(14,2) not null default 0, -- IGTF 3% por pago en divisas
  total numeric(14,2) not null default 0,
  estado legal.estado_factura not null default 'borrador',
  notas text,
  creado_por uuid references legal.perfiles(id),
  creado_en timestamptz not null default now(),
  unique (despacho_id, numero)
);
create index on legal.facturas(despacho_id, estado);

create table legal.factura_items (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid not null references legal.facturas(id) on delete cascade,
  descripcion text not null,
  cantidad numeric(10,2) not null default 1,
  precio_unitario numeric(14,2) not null default 0,
  total numeric(14,2) generated always as (round(cantidad * precio_unitario, 2)) stored
);
create index on legal.factura_items(factura_id);

create table legal.registros_tiempo (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references legal.casos(id) on delete cascade,
  abogado_id uuid not null references legal.perfiles(id),
  fecha date not null default current_date,
  horas numeric(5,2) not null check (horas > 0),
  descripcion text not null,
  tarifa numeric(12,2) not null default 0,
  facturable boolean not null default true,
  factura_id uuid references legal.facturas(id) on delete set null,
  creado_en timestamptz not null default now()
);
create index on legal.registros_tiempo(caso_id);
create index on legal.registros_tiempo(abogado_id, fecha);

create table legal.gastos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references legal.casos(id) on delete cascade,
  fecha date not null default current_date,
  descripcion text not null,       -- aranceles, copias certificadas, traslados...
  monto numeric(12,2) not null,
  moneda legal.moneda not null default 'USD',
  reembolsable boolean not null default true,
  factura_id uuid references legal.facturas(id) on delete set null,
  registrado_por uuid references legal.perfiles(id),
  creado_en timestamptz not null default now()
);
create index on legal.gastos(caso_id);

create table legal.pagos (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid not null references legal.facturas(id) on delete cascade,
  fecha date not null default current_date,
  monto numeric(14,2) not null check (monto > 0),
  moneda legal.moneda not null default 'USD',
  metodo legal.metodo_pago not null default 'transferencia',
  referencia text,
  creado_en timestamptz not null default now()
);
create index on legal.pagos(factura_id);

create table legal.alertas_correo (
  id uuid primary key default gen_random_uuid(),
  despacho_id uuid not null references legal.despachos(id) on delete cascade,
  plazo_id uuid references legal.plazos(id) on delete cascade,
  caso_id uuid references legal.casos(id) on delete cascade,
  destinatario text not null,
  asunto text not null,
  cuerpo text not null,
  dias_antes int,
  estado legal.estado_correo not null default 'pendiente',
  error text,
  programado_para timestamptz not null default now(),
  enviado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (plazo_id, destinatario, dias_antes)
);
create index on legal.alertas_correo(estado, programado_para);

-- ---------- Funciones auxiliares (security definer, evitan recursión RLS) ----------
create or replace function legal.mi_despacho() returns uuid
language sql stable security definer set search_path = '' as $$
  select despacho_id from legal.perfiles where id = (select auth.uid()) and activo
$$;

create or replace function legal.mi_rol() returns legal.rol_usuario
language sql stable security definer set search_path = '' as $$
  select rol from legal.perfiles where id = (select auth.uid()) and activo
$$;

create or replace function legal.es_gerente() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select rol in ('admin','socio') from legal.perfiles where id = (select auth.uid()) and activo), false)
$$;

-- Acceso a un caso: socios/admin del despacho, o abogados asignados al caso
create or replace function legal.puede_ver_caso(p_caso uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from legal.casos c
    join legal.perfiles p on p.id = (select auth.uid()) and p.activo and p.despacho_id = c.despacho_id
    where c.id = p_caso
      and (p.rol in ('admin','socio')
           or exists (select 1 from legal.caso_abogados ca where ca.caso_id = c.id and ca.abogado_id = p.id))
  )
$$;


create or replace function legal.es_responsable(p_caso uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from legal.caso_abogados where caso_id = p_caso and abogado_id = (select auth.uid()) and rol = 'responsable')
$$;

revoke all on function legal.mi_despacho(), legal.mi_rol(), legal.es_gerente(), legal.puede_ver_caso(uuid), legal.es_responsable(uuid) from public, anon;
grant execute on function legal.mi_despacho(), legal.mi_rol(), legal.es_gerente(), legal.puede_ver_caso(uuid), legal.es_responsable(uuid) to authenticated;

-- Totales de factura
create or replace function legal.recalcular_factura(p_factura uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_sub numeric; v_iva numeric;
begin
  select coalesce(sum(total),0) into v_sub from legal.factura_items where factura_id = p_factura;
  update legal.facturas f set
    subtotal = v_sub,
    iva_monto = round(v_sub * f.iva_porcentaje / 100, 2),
    total = round(v_sub + v_sub * f.iva_porcentaje / 100 + f.igtf_monto, 2)
  where f.id = p_factura;
end $$;

create or replace function legal.tg_items_factura() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform legal.recalcular_factura(coalesce(new.factura_id, old.factura_id));
  return null;
end $$;
create trigger items_factura_totales after insert or update or delete on legal.factura_items
for each row execute function legal.tg_items_factura();

-- Estado de factura según pagos
create or replace function legal.tg_pagos_estado() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_fid uuid := coalesce(new.factura_id, old.factura_id); v_pagado numeric; v_total numeric;
begin
  select coalesce(sum(monto),0) into v_pagado from legal.pagos where factura_id = v_fid;
  select total into v_total from legal.facturas where id = v_fid;
  update legal.facturas set estado = case
      when v_pagado >= v_total and v_total > 0 then 'pagada'::legal.estado_factura
      when v_pagado > 0 then 'parcial'::legal.estado_factura
      else estado end
  where id = v_fid and estado <> 'anulada';
  return null;
end $$;
create trigger pagos_estado after insert or update or delete on legal.pagos
for each row execute function legal.tg_pagos_estado();

create or replace function legal.tg_actualizado() returns trigger
language plpgsql set search_path = '' as $$ begin new.actualizado_en = now(); return new; end $$;
create trigger casos_actualizado before update on legal.casos for each row execute function legal.tg_actualizado();

-- Quien crea un caso queda como responsable
create or replace function legal.tg_caso_creador() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.creado_por is not null then
    insert into legal.caso_abogados(caso_id, abogado_id, rol) values (new.id, new.creado_por, 'responsable')
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger casos_creador after insert on legal.casos for each row execute function legal.tg_caso_creador();

-- ---------- Vistas ----------
create view legal.v_casos_resumen with (security_invoker = true) as
select c.*,
  cl.nombre as cliente_nombre,
  (select count(*) from legal.plazos p where p.caso_id = c.id and not p.completado) as plazos_pendientes,
  (select min(p.fecha_vencimiento) from legal.plazos p where p.caso_id = c.id and not p.completado and p.fecha_vencimiento >= now()) as proximo_plazo,
  (select coalesce(sum(r.horas),0) from legal.registros_tiempo r where r.caso_id = c.id) as horas_totales,
  (select coalesce(sum(r.horas * r.tarifa),0) from legal.registros_tiempo r where r.caso_id = c.id and r.facturable and r.factura_id is null) as por_facturar,
  (select string_agg(p.nombre, ', ' order by ca.rol) from legal.caso_abogados ca join legal.perfiles p on p.id = ca.abogado_id where ca.caso_id = c.id) as abogados
from legal.casos c join legal.clientes cl on cl.id = c.cliente_id;

create view legal.v_facturas_saldo with (security_invoker = true) as
select f.*, cl.nombre as cliente_nombre, c.codigo as caso_codigo,
  coalesce((select sum(monto) from legal.pagos p where p.factura_id = f.id),0) as pagado,
  f.total - coalesce((select sum(monto) from legal.pagos p where p.factura_id = f.id),0) as saldo
from legal.facturas f join legal.clientes cl on cl.id = f.cliente_id left join legal.casos c on c.id = f.caso_id;

-- ---------- RLS ----------
alter table legal.despachos enable row level security;
alter table legal.perfiles enable row level security;
alter table legal.clientes enable row level security;
alter table legal.casos enable row level security;
alter table legal.caso_abogados enable row level security;
alter table legal.actuaciones enable row level security;
alter table legal.plazos enable row level security;
alter table legal.documentos enable row level security;
alter table legal.sentencias enable row level security;
alter table legal.caso_sentencias enable row level security;
alter table legal.analisis_ia enable row level security;
alter table legal.facturas enable row level security;
alter table legal.factura_items enable row level security;
alter table legal.registros_tiempo enable row level security;
alter table legal.gastos enable row level security;
alter table legal.pagos enable row level security;
alter table legal.alertas_correo enable row level security;

-- despachos
create policy despacho_ver on legal.despachos for select to authenticated using (id = (select legal.mi_despacho()));
create policy despacho_editar on legal.despachos for update to authenticated using (id = (select legal.mi_despacho()) and (select legal.mi_rol()) = 'admin');

-- perfiles
create policy perfiles_ver on legal.perfiles for select to authenticated using (despacho_id = (select legal.mi_despacho()));
create policy perfiles_editar_propio on legal.perfiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()) and rol = (select legal.mi_rol()) and despacho_id = (select legal.mi_despacho()));
create policy perfiles_admin on legal.perfiles for all to authenticated using (despacho_id = (select legal.mi_despacho()) and (select legal.mi_rol()) = 'admin') with check (despacho_id = (select legal.mi_despacho()));

-- clientes: todo el despacho los ve; asistentes no borran
create policy clientes_ver on legal.clientes for select to authenticated using (despacho_id = (select legal.mi_despacho()));
create policy clientes_crear on legal.clientes for insert to authenticated with check (despacho_id = (select legal.mi_despacho()));
create policy clientes_editar on legal.clientes for update to authenticated using (despacho_id = (select legal.mi_despacho()));
create policy clientes_borrar on legal.clientes for delete to authenticated using (despacho_id = (select legal.mi_despacho()) and (select legal.es_gerente()));

-- casos
create policy casos_ver on legal.casos for select to authenticated using ((select legal.puede_ver_caso(id)));
create policy casos_crear on legal.casos for insert to authenticated with check (despacho_id = (select legal.mi_despacho()) and creado_por = (select auth.uid()));
create policy casos_editar on legal.casos for update to authenticated using ((select legal.puede_ver_caso(id))) with check (despacho_id = (select legal.mi_despacho()));
create policy casos_borrar on legal.casos for delete to authenticated using (despacho_id = (select legal.mi_despacho()) and (select legal.es_gerente()));

-- caso_abogados: ven el equipo quienes ven el caso; gestionan socios o el responsable
create policy equipo_ver on legal.caso_abogados for select to authenticated using ((select legal.puede_ver_caso(caso_id)));
create policy equipo_gestionar on legal.caso_abogados for all to authenticated
  using ((select legal.es_gerente()) and (select legal.puede_ver_caso(caso_id))
         or (select legal.es_responsable(caso_id)))
  with check ((select legal.puede_ver_caso(caso_id)));

-- tablas hijas de caso
create policy actuaciones_rw on legal.actuaciones for all to authenticated using ((select legal.puede_ver_caso(caso_id))) with check ((select legal.puede_ver_caso(caso_id)));
create policy plazos_rw on legal.plazos for all to authenticated using ((select legal.puede_ver_caso(caso_id))) with check ((select legal.puede_ver_caso(caso_id)));
create policy documentos_rw on legal.documentos for all to authenticated using ((select legal.puede_ver_caso(caso_id))) with check ((select legal.puede_ver_caso(caso_id)));
create policy caso_sentencias_rw on legal.caso_sentencias for all to authenticated using ((select legal.puede_ver_caso(caso_id))) with check ((select legal.puede_ver_caso(caso_id)));
create policy gastos_rw on legal.gastos for all to authenticated using ((select legal.puede_ver_caso(caso_id))) with check ((select legal.puede_ver_caso(caso_id)));
create policy tiempo_ver on legal.registros_tiempo for select to authenticated using ((select legal.puede_ver_caso(caso_id)));
create policy tiempo_crear on legal.registros_tiempo for insert to authenticated with check ((select legal.puede_ver_caso(caso_id)) and (abogado_id = (select auth.uid()) or (select legal.es_gerente())));
create policy tiempo_editar on legal.registros_tiempo for update to authenticated using ((select legal.puede_ver_caso(caso_id)) and (abogado_id = (select auth.uid()) or (select legal.es_gerente())));
create policy tiempo_borrar on legal.registros_tiempo for delete to authenticated using (abogado_id = (select auth.uid()) and factura_id is null);

-- análisis IA
create policy ia_ver on legal.analisis_ia for select to authenticated using ((caso_id is null and creado_por = (select auth.uid())) or (select legal.puede_ver_caso(caso_id)));
create policy ia_crear on legal.analisis_ia for insert to authenticated with check (creado_por = (select auth.uid()) and (caso_id is null or (select legal.puede_ver_caso(caso_id))));

-- sentencias TSJ: jurisprudencia pública, cualquier usuario autenticado la consulta y la añade
create policy sentencias_ver on legal.sentencias for select to authenticated using (true);
create policy sentencias_crear on legal.sentencias for insert to authenticated with check ((select legal.mi_despacho()) is not null);
create policy sentencias_editar on legal.sentencias for update to authenticated using ((select legal.es_gerente()));

-- facturación: socios/admin ven todo; abogados ven las de sus casos
create policy facturas_ver on legal.facturas for select to authenticated using (despacho_id = (select legal.mi_despacho()) and ((select legal.es_gerente()) or (caso_id is not null and (select legal.puede_ver_caso(caso_id)))));
create policy facturas_crear on legal.facturas for insert to authenticated with check (despacho_id = (select legal.mi_despacho()) and ((select legal.es_gerente()) or (caso_id is not null and (select legal.puede_ver_caso(caso_id)))));
create policy facturas_editar on legal.facturas for update to authenticated using (despacho_id = (select legal.mi_despacho()) and ((select legal.es_gerente()) or (estado = 'borrador' and caso_id is not null and (select legal.puede_ver_caso(caso_id)))));
create policy facturas_borrar on legal.facturas for delete to authenticated using (despacho_id = (select legal.mi_despacho()) and (select legal.es_gerente()) and estado = 'borrador');
create policy items_rw on legal.factura_items for all to authenticated
  using (exists (select 1 from legal.facturas f where f.id = factura_id))
  with check (exists (select 1 from legal.facturas f where f.id = factura_id and f.estado = 'borrador'));
create policy pagos_ver on legal.pagos for select to authenticated using (exists (select 1 from legal.facturas f where f.id = factura_id));
create policy pagos_crear on legal.pagos for insert to authenticated with check ((select legal.es_gerente()) and exists (select 1 from legal.facturas f where f.id = factura_id));

-- alertas: solo lectura para gerentes y para el destinatario; las escribe el servidor (service role)
create policy alertas_ver on legal.alertas_correo for select to authenticated using (despacho_id = (select legal.mi_despacho()) and ((select legal.es_gerente()) or destinatario = (select email from legal.perfiles where id = (select auth.uid()))));

-- ---------- Permisos de API ----------
grant usage on schema legal to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema legal to authenticated;
grant all on all tables in schema legal to service_role;
grant usage, select on all sequences in schema legal to authenticated, service_role;
grant execute on function legal.recalcular_factura(uuid) to authenticated, service_role;
alter default privileges in schema legal grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema legal grant all on tables to service_role;
