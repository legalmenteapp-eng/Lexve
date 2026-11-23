-- =====================================================================
-- Datos de prueba LexVE (ficticios). Contraseña de todos: LexVE-Demo-2026!
-- =====================================================================
do $$
declare
  v_desp uuid := '11111111-1111-4111-8111-111111111111';
  u_socia uuid := 'a0000000-0000-4000-8000-000000000001';
  u_carlos uuid := 'a0000000-0000-4000-8000-000000000002';
  u_andre uuid := 'a0000000-0000-4000-8000-000000000003';
  u_jose uuid := 'a0000000-0000-4000-8000-000000000004';
  u_luisa uuid := 'a0000000-0000-4000-8000-000000000005';
  r record;
begin
  -- Usuarios de Auth
  for r in select * from (values
    (u_socia, 'socia@lexve.demo', 'María Fernanda Rodríguez'),
    (u_carlos,'carlos@lexve.demo','Carlos Eduardo Pérez'),
    (u_andre, 'andreina@lexve.demo','Andreína Márquez'),
    (u_jose,  'josegregorio@lexve.demo','José Gregorio Salazar'),
    (u_luisa, 'asistente@lexve.demo','Luisa Contreras')) t(id,email,nombre)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values ('00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated', r.email,
      extensions.crypt('LexVE-Demo-2026!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('nombre', r.nombre), now(), now(),
      '', '', '', '', '', '', '', '')
    on conflict (id) do nothing;
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), r.id, r.id::text, jsonb_build_object('sub', r.id::text, 'email', r.email, 'email_verified', true), 'email', now(), now(), now())
    on conflict do nothing;
  end loop;

  insert into legal.despachos (id, nombre, rif, direccion, telefono, email)
  values (v_desp, 'Rodríguez, Pérez & Asociados (DEMO)', 'J-40123456-7', 'Av. Francisco de Miranda, Torre Demo, piso 8, Chacao, Caracas', '+58 212-555-0100', 'contacto@lexve.demo')
  on conflict do nothing;

  insert into legal.perfiles (id, despacho_id, nombre, email, rol, inpreabogado, cedula, telefono, tarifa_hora) values
    (u_socia, v_desp, 'María Fernanda Rodríguez', 'socia@lexve.demo', 'socio', '45.210', 'V-10.234.567', '+58 414-555-0101', 150),
    (u_carlos,v_desp, 'Carlos Eduardo Pérez', 'carlos@lexve.demo', 'abogado', '98.765', 'V-15.678.901', '+58 412-555-0102', 90),
    (u_andre, v_desp, 'Andreína Márquez', 'andreina@lexve.demo', 'abogado', '187.432', 'V-20.345.678', '+58 424-555-0103', 75),
    (u_jose,  v_desp, 'José Gregorio Salazar', 'josegregorio@lexve.demo', 'abogado', '132.908', 'V-17.890.123', '+58 416-555-0104', 80),
    (u_luisa, v_desp, 'Luisa Contreras', 'asistente@lexve.demo', 'asistente', null, 'V-24.567.890', '+58 414-555-0105', 25)
  on conflict do nothing;
end $$;

-- Clientes
insert into legal.clientes (despacho_id, tipo, nombre, cedula_rif, email, telefono, direccion, ciudad, estado_region, drive_folder_url, notas) values
('11111111-1111-4111-8111-111111111111','juridica','Inversiones Ávila 2020, C.A.','J-41234567-8','legal@avila2020.demo','+58 212-555-1001','Av. Libertador, Caracas','Caracas','Distrito Capital','https://drive.google.com/drive/folders/DEMO_AVILA','Cliente corporativo, iguala mensual'),
('11111111-1111-4111-8111-111111111111','juridica','Distribuidora Los Andes, S.A.','J-30987654-1','gerencia@losandes.demo','+58 274-555-1002','Av. Las Américas, Mérida','Mérida','Mérida',null,'Conflictos comerciales y laborales'),
('11111111-1111-4111-8111-111111111111','natural','Pedro José Hernández','V-8.765.432','pedroh@correo.demo','+58 414-555-1003','Urb. El Paraíso, Caracas','Caracas','Distrito Capital','https://drive.google.com/drive/folders/DEMO_HERNANDEZ',null),
('11111111-1111-4111-8111-111111111111','natural','Ana Lucía Gómez de Rivas','V-13.456.789','analucia@correo.demo','+58 424-555-1004','Los Palos Grandes, Caracas','Caracas','Miranda',null,'Divorcio y régimen de convivencia'),
('11111111-1111-4111-8111-111111111111','juridica','Constructora Orinoco 3000, C.A.','J-29876543-0','obras@orinoco3000.demo','+58 286-555-1005','Puerto Ordaz','Ciudad Guayana','Bolívar','https://drive.google.com/drive/folders/DEMO_ORINOCO',null),
('11111111-1111-4111-8111-111111111111','natural','Luis Alberto Moreno','V-11.222.333','lamoreno@correo.demo','+58 412-555-1006','La Candelaria, Caracas','Caracas','Distrito Capital',null,'Defensa penal'),
('11111111-1111-4111-8111-111111111111','juridica','Farmacia Santa Rosa, C.A.','J-31122334-5','admin@santarosa.demo','+58 241-555-1007','Av. Bolívar Norte, Valencia','Valencia','Carabobo',null,'Fiscalización SENIAT'),
('11111111-1111-4111-8111-111111111111','natural','Carmen Elena Villalobos','V-6.543.210','carmenv@correo.demo','+58 261-555-1008','Bella Vista, Maracaibo','Maracaibo','Zulia',null,'Sucesión'),
('11111111-1111-4111-8111-111111111111','juridica','Agropecuaria El Samán, C.A.','J-40555666-2','info@elsaman.demo','+58 246-555-1009','San Juan de los Morros','San Juan de los Morros','Guárico',null,'Afectación de tierras'),
('11111111-1111-4111-8111-111111111111','natural','Rafael Antonio Guzmán','V-19.876.543','rguzman@correo.demo','+58 416-555-1010','Barquisimeto','Barquisimeto','Lara',null,'Despido injustificado');

-- Casos
with cl as (select id, nombre from legal.clientes where despacho_id = '11111111-1111-4111-8111-111111111111')
insert into legal.casos (despacho_id, cliente_id, codigo, numero_expediente, titulo, materia, estado, etapa, tribunal, circunscripcion, juez, contraparte, abogado_contraparte, descripcion, cuantia, moneda, prioridad, fecha_inicio, tarifa_tipo, tarifa_monto, creado_por, drive_folder_url)
select '11111111-1111-4111-8111-111111111111', (select id from cl where nombre = c.cliente), c.codigo, c.exp, c.titulo, c.materia::legal.materia, c.estado::legal.estado_caso, c.etapa, c.tribunal, c.circ, c.juez, c.contraparte, c.abog_contra, c.descr, c.cuantia, 'USD', c.prio, (current_date - c.dias_atras), c.tarifa_tipo, c.tarifa, c.creador::uuid, c.drive
from (values
 ('Inversiones Ávila 2020, C.A.','LEX-2025-001','AP11-V-2025-000312','Cobro de bolívares por vía de intimación contra Comercial Tamanaco','civil','en_tramite','Contestación de la demanda','Juzgado Quinto de Primera Instancia en lo Civil, Mercantil, Tránsito y Bancario','Área Metropolitana de Caracas','Abg. Demo Juez Uno','Comercial Tamanaco, C.A.','Abg. Ricardo Contreras','Cobro de facturas aceptadas por USD 85.000 por suministro de mobiliario. Se decretó medida preventiva de embargo.',85000,1,240,'por_hora',null,'a0000000-0000-4000-8000-000000000001','https://drive.google.com/drive/folders/DEMO_CASO1'),
 ('Inversiones Ávila 2020, C.A.','LEX-2026-002',null,'Revisión de contrato de arrendamiento comercial (Decreto-Ley de Arrendamientos Inmobiliarios para Uso Comercial)','mercantil','abierto','Asesoría','—',null,null,'Centro Comercial Demo','—','Revisión de cláusulas de canon en divisas y ajuste conforme al Decreto-Ley de 2014.',null,3,20,'iguala',800,'a0000000-0000-4000-8000-000000000002',null),
 ('Distribuidora Los Andes, S.A.','LEX-2025-003','LP21-L-2025-000145','Demanda por prestaciones sociales — ex gerente de ventas','laboral','en_tramite','Audiencia preliminar','Tribunal Primero de Primera Instancia de Sustanciación, Mediación y Ejecución del Trabajo','Estado Mérida','Abg. Demo Juez Dos','Jesús Alberto Rangel','Abg. Mariela Duarte','Ex trabajador reclama prestaciones sociales, utilidades y vacaciones fraccionadas conforme a la LOTTT, más indemnización por despido.',42000,1,150,'por_hora',null,'a0000000-0000-4000-8000-000000000003',null),
 ('Pedro José Hernández','LEX-2025-004','AP11-V-2024-000987','Acción reivindicatoria de inmueble en El Paraíso','civil','en_sentencia','Informes / sentencia','Juzgado Tercero de Primera Instancia en lo Civil, Mercantil, Tránsito y Bancario','Área Metropolitana de Caracas','Abg. Demo Juez Tres','Inquilinos ocupantes','Abg. Defensor Demo','Reivindicación de apartamento ocupado sin título. Fase de informes concluida; se espera sentencia.',120000,1,420,'fija',3500,'a0000000-0000-4000-8000-000000000001','https://drive.google.com/drive/folders/DEMO_CASO4'),
 ('Ana Lucía Gómez de Rivas','LEX-2026-005','AP51-V-2026-000221','Divorcio contencioso y régimen de convivencia familiar','lopnna','en_tramite','Fase de mediación','Tribunal de Protección de Niños, Niñas y Adolescentes, Sala de Mediación y Sustanciación','Área Metropolitana de Caracas','Abg. Demo Juez Cuatro','Gustavo Rivas','Abg. Demo Contraparte','Divorcio con causal de ruptura prolongada de la vida en común (art. 185-A CC) y fijación de obligación de manutención para dos hijos.',null,1,95,'fija',2500,'a0000000-0000-4000-8000-000000000003',null),
 ('Constructora Orinoco 3000, C.A.','LEX-2025-006','FP11-V-2025-000078','Resolución de contrato de obra y daños y perjuicios','mercantil','apelacion','Apelación','Juzgado Superior en lo Civil, Mercantil y del Tránsito','Estado Bolívar','Abg. Demo Juez Cinco','Desarrollos Caroní, C.A.','Abg. Demo Caroní','Sentencia de primera instancia parcialmente desfavorable. Se ejerció apelación; pendiente fijación de informes en alzada.',310000,1,300,'cuota_litis',15,'a0000000-0000-4000-8000-000000000001','https://drive.google.com/drive/folders/DEMO_CASO6'),
 ('Luis Alberto Moreno','LEX-2026-007','AP01-P-2026-000456','Defensa penal — presunta estafa (art. 462 Código Penal)','penal','en_tramite','Fase preparatoria','Tribunal Décimo de Primera Instancia en Funciones de Control','Área Metropolitana de Caracas','Abg. Demo Juez Seis','Ministerio Público — Fiscalía Demo','Fiscal Demo','Imputación por estafa. Medida cautelar sustitutiva de presentación periódica. Preparar escrito de descargos y promoción de diligencias de investigación.',null,1,60,'fija',5000,'a0000000-0000-4000-8000-000000000004',null),
 ('Farmacia Santa Rosa, C.A.','LEX-2026-008','—','Recurso jerárquico contra resolución de sumario administrativo SENIAT','tributario','abierto','Vía administrativa','SENIAT — Gerencia Regional de Tributos Internos Región Central','Estado Carabobo',null,'SENIAT','—','Reparo por IVA y multa por incumplimiento de deberes formales. Plazo de 25 días hábiles para el recurso jerárquico (COT).',18500,1,12,'fija',2800,'a0000000-0000-4000-8000-000000000002',null),
 ('Carmen Elena Villalobos','LEX-2025-009','VP31-S-2025-000321','Partición de herencia — sucesión Villalobos','civil','ejecucion','Ejecución de partición','Juzgado Segundo de Primera Instancia en lo Civil, Mercantil y del Tránsito','Estado Zulia','Abg. Demo Juez Siete','Coherederos','Abg. Demo Coherederos','Partición de bienes hereditarios: dos inmuebles y cuentas bancarias. Designado partidor.',95000,2,500,'por_hora',null,'a0000000-0000-4000-8000-000000000004',null),
 ('Agropecuaria El Samán, C.A.','LEX-2026-010','JP41-G-2026-000033','Recurso contencioso administrativo agrario contra acto del INTi','agrario','en_tramite','Admisión','Juzgado Superior Agrario','Estado Guárico','Abg. Demo Juez Ocho','Instituto Nacional de Tierras (INTi)','Procuraduría General de la República','Nulidad de acto de rescate de tierras sobre fundo productivo. Solicitud de medida cautelar de protección a la producción agroalimentaria.',null,1,40,'por_hora',null,'a0000000-0000-4000-8000-000000000002',null),
 ('Rafael Antonio Guzmán','LEX-2026-011','KP02-L-2026-000098','Calificación de despido y reenganche','laboral','abierto','Introducción de demanda','Tribunal de Sustanciación, Mediación y Ejecución del Trabajo','Estado Lara',null,'Industrias Demo Lara, C.A.',null,'Trabajador amparado por inamovilidad laboral (Decreto vigente). Despido sin calificación previa ante la Inspectoría.',null,2,8,'cuota_litis',20,'a0000000-0000-4000-8000-000000000003',null),
 ('Inversiones Ávila 2020, C.A.','LEX-2024-012','AP11-M-2024-000045','Ejecución de hipoteca — Inmobiliaria Demo','mercantil','cerrado','Terminado por transacción','Juzgado Octavo de Primera Instancia en lo Civil, Mercantil, Tránsito y Bancario','Área Metropolitana de Caracas','Abg. Demo Juez Nueve','Inmobiliaria Demo, C.A.','Abg. Demo Inmobiliaria','Transacción homologada; pago total recibido.',60000,3,700,'por_hora',null,'a0000000-0000-4000-8000-000000000001',null)
) as c(cliente,codigo,exp,titulo,materia,estado,etapa,tribunal,circ,juez,contraparte,abog_contra,descr,cuantia,prio,dias_atras,tarifa_tipo,tarifa,creador,drive);

update legal.casos set fecha_cierre = current_date - 30 where codigo = 'LEX-2024-012';

-- Equipos (el creador ya quedó como responsable por trigger)
insert into legal.caso_abogados (caso_id, abogado_id, rol)
select c.id, a.abogado::uuid, a.rol::legal.rol_en_caso from (values
 ('LEX-2025-001','a0000000-0000-4000-8000-000000000002','colaborador'),
 ('LEX-2025-001','a0000000-0000-4000-8000-000000000005','pasante'),
 ('LEX-2025-003','a0000000-0000-4000-8000-000000000004','colaborador'),
 ('LEX-2025-004','a0000000-0000-4000-8000-000000000003','colaborador'),
 ('LEX-2026-005','a0000000-0000-4000-8000-000000000001','consultor'),
 ('LEX-2025-006','a0000000-0000-4000-8000-000000000002','colaborador'),
 ('LEX-2025-006','a0000000-0000-4000-8000-000000000004','colaborador'),
 ('LEX-2026-007','a0000000-0000-4000-8000-000000000001','consultor'),
 ('LEX-2026-008','a0000000-0000-4000-8000-000000000003','colaborador'),
 ('LEX-2026-010','a0000000-0000-4000-8000-000000000001','consultor'),
 ('LEX-2026-011','a0000000-0000-4000-8000-000000000004','colaborador')
) a(codigo, abogado, rol) join legal.casos c on c.codigo = a.codigo
on conflict do nothing;

-- Actuaciones (tracking)
insert into legal.actuaciones (caso_id, fecha, tipo, titulo, descripcion, autor_id)
select c.id, now() - (a.dias || ' days')::interval, a.tipo::legal.tipo_actuacion, a.titulo, a.descr, a.autor::uuid from (values
 ('LEX-2025-001',238,'escrito','Introducción de libelo de demanda','Demanda por intimación con facturas aceptadas anexas.','a0000000-0000-4000-8000-000000000001'),
 ('LEX-2025-001',225,'auto','Admisión de la demanda y decreto de intimación',null,'a0000000-0000-4000-8000-000000000002'),
 ('LEX-2025-001',200,'auto','Decreto de medida preventiva de embargo','Embargo sobre bienes muebles hasta por el doble de lo demandado.','a0000000-0000-4000-8000-000000000002'),
 ('LEX-2025-001',120,'citacion','Intimación practicada por el alguacil',null,'a0000000-0000-4000-8000-000000000005'),
 ('LEX-2025-001',100,'escrito','Oposición al decreto de intimación (contraparte)','La parte intimada formuló oposición; el procedimiento continúa por vía ordinaria.','a0000000-0000-4000-8000-000000000002'),
 ('LEX-2025-001',15,'reunion_cliente','Reunión con gerente legal del cliente','Se revisó estrategia de promoción de pruebas.','a0000000-0000-4000-8000-000000000001'),
 ('LEX-2025-003',148,'citacion','Notificación de la demandada',null,'a0000000-0000-4000-8000-000000000003'),
 ('LEX-2025-003',110,'audiencia','Audiencia preliminar — primera sesión','Se consignaron escritos de promoción de pruebas. Prolongada.','a0000000-0000-4000-8000-000000000003'),
 ('LEX-2025-003',45,'audiencia','Audiencia preliminar — prolongación','Sin acuerdo. Propuesta de pago de USD 18.000 rechazada.','a0000000-0000-4000-8000-000000000004'),
 ('LEX-2025-004',410,'escrito','Libelo de acción reivindicatoria',null,'a0000000-0000-4000-8000-000000000001'),
 ('LEX-2025-004',300,'prueba','Promoción de pruebas — documento de propiedad registrado',null,'a0000000-0000-4000-8000-000000000003'),
 ('LEX-2025-004',90,'escrito','Consignación de informes',null,'a0000000-0000-4000-8000-000000000001'),
 ('LEX-2026-005',90,'escrito','Solicitud de divorcio',null,'a0000000-0000-4000-8000-000000000003'),
 ('LEX-2026-005',30,'audiencia','Audiencia de mediación','Se acordó régimen de convivencia provisional.','a0000000-0000-4000-8000-000000000003'),
 ('LEX-2025-006',60,'sentencia','Sentencia de primera instancia','Parcialmente con lugar: resuelve el contrato pero niega daños emergentes.','a0000000-0000-4000-8000-000000000001'),
 ('LEX-2025-006',55,'diligencia','Apelación ejercida',null,'a0000000-0000-4000-8000-000000000002'),
 ('LEX-2025-006',20,'auto','Oída la apelación en ambos efectos',null,'a0000000-0000-4000-8000-000000000004'),
 ('LEX-2026-007',58,'audiencia','Audiencia de presentación','Medida cautelar sustitutiva de presentación cada 30 días.','a0000000-0000-4000-8000-000000000004'),
 ('LEX-2026-007',10,'escrito','Solicitud de diligencias de investigación al MP',null,'a0000000-0000-4000-8000-000000000004'),
 ('LEX-2026-008',10,'notificacion','Notificación de resolución culminatoria de sumario',null,'a0000000-0000-4000-8000-000000000002'),
 ('LEX-2025-009',480,'escrito','Demanda de partición',null,'a0000000-0000-4000-8000-000000000004'),
 ('LEX-2025-009',60,'auto','Designación de partidor',null,'a0000000-0000-4000-8000-000000000004'),
 ('LEX-2026-010',38,'escrito','Recurso de nulidad con solicitud de medida cautelar',null,'a0000000-0000-4000-8000-000000000002'),
 ('LEX-2026-011',7,'reunion_cliente','Entrevista inicial con el trabajador','Se recabaron recibos de pago y carta de despido.','a0000000-0000-4000-8000-000000000003'),
 ('LEX-2024-012',35,'auto','Homologación de transacción',null,'a0000000-0000-4000-8000-000000000001')
) a(codigo,dias,tipo,titulo,descr,autor) join legal.casos c on c.codigo = a.codigo;

-- Plazos y alertas (relativos a hoy)
insert into legal.plazos (caso_id, titulo, descripcion, tipo, fecha_vencimiento, responsable_id, completado)
select c.id, p.titulo, p.descr, p.tipo::legal.tipo_plazo, (current_date + p.dias) + time '09:00', p.resp::uuid, p.dias < 0 from (values
 ('LEX-2025-001','Lapso de promoción de pruebas','15 días de despacho (art. 396 CPC)','lapso_procesal',2,'a0000000-0000-4000-8000-000000000002'),
 ('LEX-2025-001','Oposición a las pruebas de la contraparte',null,'lapso_procesal',9,'a0000000-0000-4000-8000-000000000002'),
 ('LEX-2025-003','Audiencia de juicio','Tribunal de Juicio del Trabajo — Mérida','audiencia',5,'a0000000-0000-4000-8000-000000000003'),
 ('LEX-2025-004','Plazo para dictar sentencia (60 días)','Vigilar diferimiento; preparar eventual apelación','lapso_procesal',12,'a0000000-0000-4000-8000-000000000001'),
 ('LEX-2026-005','Audiencia de sustanciación',null,'audiencia',1,'a0000000-0000-4000-8000-000000000003'),
 ('LEX-2025-006','Presentación de informes en alzada','Día 20 de despacho tras recibo del expediente','lapso_procesal',3,'a0000000-0000-4000-8000-000000000002'),
 ('LEX-2026-007','Presentación periódica del imputado','Recordar al cliente','reunion',4,'a0000000-0000-4000-8000-000000000004'),
 ('LEX-2026-007','Fin de fase preparatoria (estimado)',null,'lapso_procesal',60,'a0000000-0000-4000-8000-000000000004'),
 ('LEX-2026-008','Vencimiento recurso jerárquico (25 días hábiles COT)','Consignar ante la Gerencia Regional','vencimiento_recurso',6,'a0000000-0000-4000-8000-000000000002'),
 ('LEX-2025-009','Consignación de informe del partidor',null,'lapso_procesal',20,'a0000000-0000-4000-8000-000000000004'),
 ('LEX-2026-010','Audiencia oral agraria',null,'audiencia',14,'a0000000-0000-4000-8000-000000000002'),
 ('LEX-2026-011','Caducidad de la acción de reenganche (30 días)','¡Crítico! Introducir antes del vencimiento','prescripcion',0,'a0000000-0000-4000-8000-000000000003'),
 ('LEX-2025-001','Contestación (cumplido)',null,'lapso_procesal',-90,'a0000000-0000-4000-8000-000000000002'),
 ('LEX-2025-003','Consignación escrito de pruebas (cumplido)',null,'lapso_procesal',-111,'a0000000-0000-4000-8000-000000000003')
) p(codigo,titulo,descr,tipo,dias,resp) join legal.casos c on c.codigo = p.codigo;
update legal.plazos set completado_en = fecha_vencimiento where completado;

-- Documentos con texto para análisis IA
insert into legal.documentos (caso_id, nombre, tipo, mime_type, origen, url, contenido_texto, subido_por)
select c.id, d.nombre, d.tipo, d.mime, d.origen, d.url, d.texto, d.autor::uuid from (values
 ('LEX-2025-001','Libelo de demanda — intimación.pdf','demanda','application/pdf','drive','https://drive.google.com/file/d/DEMO_LIBELO1',
  'CIUDADANO JUEZ DE PRIMERA INSTANCIA EN LO CIVIL, MERCANTIL, TRÁNSITO Y BANCARIO DEL ÁREA METROPOLITANA DE CARACAS. Su despacho. Yo, MARÍA FERNANDA RODRÍGUEZ, abogada inscrita en el Inpreabogado bajo el N.º 45.210, actuando como apoderada judicial de INVERSIONES ÁVILA 2020, C.A., ocurro ante su competente autoridad para demandar, como en efecto demando, por el procedimiento de intimación previsto en los artículos 640 y siguientes del Código de Procedimiento Civil, a la sociedad mercantil COMERCIAL TAMANACO, C.A., para que pague la cantidad de OCHENTA Y CINCO MIL DÓLARES (USD 85.000,00) o su equivalente en bolívares a la tasa oficial del BCV, por concepto de facturas aceptadas números 0001234 a 0001240 derivadas del suministro de mobiliario de oficina. Solicito se decrete medida preventiva de embargo conforme al artículo 646 del CPC por tratarse de facturas aceptadas.','a0000000-0000-4000-8000-000000000001'),
 ('LEX-2025-001','Escrito de oposición — contraparte.pdf','escrito','application/pdf','drive','https://drive.google.com/file/d/DEMO_OPOS1',
  'La demandada se opone al decreto intimatorio alegando que las facturas no fueron aceptadas por persona con facultad de obligar a la empresa, que el mobiliario fue entregado incompleto y que existe compensación por penalidades contractuales de USD 12.000.','a0000000-0000-4000-8000-000000000002'),
 ('LEX-2025-003','Libelo laboral — Rangel.pdf','demanda','application/pdf','drive','https://drive.google.com/file/d/DEMO_LAB1',
  'El ciudadano JESÚS ALBERTO RANGEL demanda a DISTRIBUIDORA LOS ANDES, S.A. por cobro de prestaciones sociales conforme al artículo 142 de la LOTTT, utilidades fraccionadas, vacaciones y bono vacacional, e indemnización por despido injustificado (art. 92 LOTTT). Alega un salario integral de USD 1.400 mensuales incluyendo bonos en divisas no reflejados en recibos. Tiempo de servicio: 6 años y 4 meses.','a0000000-0000-4000-8000-000000000003'),
 ('LEX-2025-006','Sentencia primera instancia — Orinoco.pdf','sentencia','application/pdf','drive','https://drive.google.com/file/d/DEMO_SENT6',
  'Se declara PARCIALMENTE CON LUGAR la demanda de resolución de contrato de obra intentada por CONSTRUCTORA ORINOCO 3000, C.A. contra DESARROLLOS CARONÍ, C.A. Se declara resuelto el contrato. Se niega la indemnización por daños emergentes por cuanto la actora no demostró la cuantía del daño mediante experticia. Se niega el lucro cesante por falta de prueba. No hay condenatoria en costas por no haber vencimiento total.','a0000000-0000-4000-8000-000000000001'),
 ('LEX-2026-008','Resolución culminatoria de sumario SENIAT.pdf','acto_administrativo','application/pdf','drive','https://drive.google.com/file/d/DEMO_SENIAT',
  'Se confirma el reparo en materia de IVA por Bs. equivalentes a USD 14.200 por débitos fiscales omitidos en los períodos enero a junio, y se impone multa por incumplimiento de deberes formales (facturas sin requisitos de la Providencia SNAT/2011/0071). Intereses moratorios calculados conforme al artículo 66 del COT.','a0000000-0000-4000-8000-000000000002'),
 ('LEX-2026-011','Carta de despido — Guzmán.jpg','prueba','image/jpeg','drive','https://drive.google.com/file/d/DEMO_CARTA',
  'Por medio de la presente le notificamos que a partir de la presente fecha se prescinde de sus servicios por reestructuración. Sírvase pasar por el departamento de RR.HH. para su liquidación.','a0000000-0000-4000-8000-000000000003')
) d(codigo,nombre,tipo,mime,origen,url,texto,autor) join legal.casos c on c.codigo = d.codigo;

-- Jurisprudencia de ejemplo (registros ilustrativos; verificar en tsj.gob.ve antes de citar)
insert into legal.sentencias (sala, numero, expediente, fecha, ponente, partes, materia, asunto, resumen, doctrina, url, fuente) values
('constitucional','EJEMPLO-001','EJ-00-0001','2001-01-01','(Ejemplo)','(Ejemplo)','constitucional','Amparo constitucional — requisitos de admisibilidad','Registro de ejemplo para pruebas de la app. Reemplazar por sentencias reales importadas desde el TSJ.','El amparo es una vía extraordinaria que procede cuando no existen vías ordinarias idóneas para restablecer la situación jurídica infringida.',null,'manual'),
('casacion_civil','EJEMPLO-002','EJ-00-0002','2002-01-01','(Ejemplo)','(Ejemplo)','civil','Procedimiento por intimación — facturas aceptadas','Registro de ejemplo para pruebas de la app.','La factura aceptada constituye prueba escrita suficiente para el procedimiento intimatorio y para decretar medidas preventivas.',null,'manual'),
('casacion_social','EJEMPLO-003','EJ-00-0003','2003-01-01','(Ejemplo)','(Ejemplo)','laboral','Carga de la prueba en materia laboral — salario y bonos','Registro de ejemplo para pruebas de la app.','Cuando el patrono admite la relación laboral, le corresponde la carga de desvirtuar los conceptos y montos salariales alegados por el trabajador.',null,'manual'),
('politico_administrativa','EJEMPLO-004','EJ-00-0004','2004-01-01','(Ejemplo)','(Ejemplo)','tributario','Suspensión de efectos de actos tributarios','Registro de ejemplo para pruebas de la app.','La suspensión de efectos procede cuando se acredita el fumus boni iuris y el periculum in mora conforme al COT.',null,'manual'),
('casacion_civil','EJEMPLO-005','EJ-00-0005','2005-01-01','(Ejemplo)','(Ejemplo)','mercantil','Daños y perjuicios — necesidad de prueba de la cuantía','Registro de ejemplo para pruebas de la app.','La procedencia de daños materiales exige la demostración de su existencia y cuantía; la experticia complementaria procede solo si se probó el daño.',null,'manual');

insert into legal.caso_sentencias (caso_id, sentencia_id, relevancia, nota, vinculado_por)
select c.id, s.id, 4, 'Vinculada como apoyo argumentativo (dato de prueba)', c.creado_por
from legal.casos c join legal.sentencias s on (c.codigo, s.numero) in (('LEX-2025-001','EJEMPLO-002'),('LEX-2025-003','EJEMPLO-003'),('LEX-2025-006','EJEMPLO-005'),('LEX-2026-008','EJEMPLO-004'));

-- Registros de tiempo (aleatorios pero reproducibles)
select setseed(0.42);
insert into legal.registros_tiempo (caso_id, abogado_id, fecha, horas, descripcion, tarifa, facturable, creado_en)
select ca.caso_id, ca.abogado_id, d, round((0.5 + random()*3.5)::numeric * 2) / 2,
  (array['Revisión de expediente','Redacción de escrito','Asistencia a tribunal','Reunión con cliente','Investigación jurisprudencial','Llamada con contraparte','Preparación de audiencia','Análisis de pruebas'])[1 + floor(random()*8)::int],
  p.tarifa_hora, random() > 0.1, d
from legal.caso_abogados ca
join legal.perfiles p on p.id = ca.abogado_id
join legal.casos c on c.id = ca.caso_id and c.estado <> 'cerrado'
cross join lateral generate_series(current_date - 75, current_date - 1, interval '9 days') g(d)
where random() < 0.55;

-- Gastos
insert into legal.gastos (caso_id, fecha, descripcion, monto, registrado_por)
select c.id, current_date - g.dias, g.descr, g.monto, c.creado_por from (values
 ('LEX-2025-001',200,'Traslado del tribunal para práctica de embargo',150),
 ('LEX-2025-001',190,'Honorarios del depositario judicial',300),
 ('LEX-2025-003',100,'Copias certificadas',35),
 ('LEX-2025-004',300,'Certificación de gravámenes — Registro',60),
 ('LEX-2025-006',50,'Viaje Caracas–Puerto Ordaz (audiencia)',220),
 ('LEX-2025-009',70,'Publicación de edictos en prensa',90),
 ('LEX-2026-010',35,'Inspección judicial en el fundo',180)
) g(codigo,dias,descr,monto) join legal.casos c on c.codigo = g.codigo;

-- Facturas
insert into legal.facturas (despacho_id, cliente_id, caso_id, numero, numero_control, fecha_emision, fecha_vencimiento, moneda, tasa_bcv, estado, creado_por, notas)
select '11111111-1111-4111-8111-111111111111', c.cliente_id, c.id, f.num, f.ctrl, current_date - f.dias, current_date - f.dias + 15, 'USD', f.tasa, 'emitida', 'a0000000-0000-4000-8000-000000000001', f.notas
from (values
 ('LEX-2025-001','F-000101','00-000101',95,  175.50,'Honorarios julio'),
 ('LEX-2025-001','F-000108','00-000108',35,  185.20,'Honorarios agosto'),
 ('LEX-2025-003','F-000102','00-000102',80,  178.10,null),
 ('LEX-2025-004','F-000103','00-000103',70,  179.40,'Primera cuota de honorarios fijos'),
 ('LEX-2026-005','F-000104','00-000104',60,  181.00,null),
 ('LEX-2026-007','F-000105','00-000105',55,  182.30,'Anticipo defensa penal'),
 ('LEX-2026-002','F-000106','00-000106',30,  186.00,'Iguala mensual'),
 ('LEX-2025-009','F-000107','00-000107',10,  190.70,null),
 ('LEX-2026-008','F-000109',null,       1,   192.00,'Borrador — pendiente de revisión')
) f(codigo,num,ctrl,dias,tasa,notas) join legal.casos c on c.codigo = f.codigo;
update legal.facturas set estado = 'borrador' where numero = 'F-000109';

insert into legal.factura_items (factura_id, descripcion, cantidad, precio_unitario)
select f.id, i.descr, i.cant, i.precio from (values
 ('F-000101','Horas profesionales — socia',12,150),('F-000101','Horas profesionales — abogado',18,90),('F-000101','Gastos de traslado y depositario',1,450),
 ('F-000108','Horas profesionales — socia',6,150),('F-000108','Horas profesionales — abogado',10,90),
 ('F-000102','Horas profesionales — audiencia preliminar',16,75),
 ('F-000103','Honorarios fijos — cuota 1 de 2',1,1750),
 ('F-000104','Honorarios fijos — divorcio (50%)',1,1250),
 ('F-000105','Anticipo honorarios defensa penal',1,2500),
 ('F-000106','Iguala mensual — asesoría corporativa',1,800),
 ('F-000107','Horas profesionales — partición',14,80),
 ('F-000109','Honorarios recurso jerárquico (50%)',1,1400)
) i(num,descr,cant,precio) join legal.facturas f on f.numero = i.num;

update legal.facturas set igtf_monto = round(subtotal * 1.16 * 0.03, 2) where numero in ('F-000101','F-000105');
select legal.recalcular_factura(id) from legal.facturas;

insert into legal.pagos (factura_id, fecha, monto, moneda, metodo, referencia)
select f.id, f.fecha_emision + p.d, case when p.total then f.total else round(f.total * 0.5, 2) end, 'USD', p.metodo::legal.metodo_pago, p.ref
from (values
 ('F-000101',10,true,'zelle','ZL-88213'),
 ('F-000102',12,true,'transferencia','BNC-001245'),
 ('F-000103',5,true,'pago_movil','PM-554120'),
 ('F-000104',8,false,'efectivo',null),
 ('F-000105',3,true,'zelle','ZL-90110'),
 ('F-000106',4,true,'transferencia','MER-778812')
) p(num,d,total,metodo,ref) join legal.facturas f on f.numero = p.num;
update legal.facturas set estado = 'vencida' where estado = 'emitida' and fecha_vencimiento < current_date;

-- Marcar horas ya facturadas en casos con facturas por horas
update legal.registros_tiempo r set factura_id = f.id
from legal.facturas f join legal.casos c on c.id = f.caso_id
where r.caso_id = c.id and f.numero in ('F-000101','F-000102','F-000107') and r.fecha < f.fecha_emision;

-- Un análisis IA de muestra
insert into legal.analisis_ia (caso_id, tipo, pregunta, resultado, modelo, creado_por)
select id, 'caso', 'Análisis inicial del caso',
'**Resumen:** Cobro por intimación de USD 85.000 con facturas aceptadas; la contraparte se opuso alegando falta de facultad del firmante, entrega incompleta y compensación.

**Fortalezas:** facturas aceptadas (prueba escrita, art. 644 CPC); medida de embargo decretada.

**Riesgos:** demostrar la representación de quien aceptó las facturas; la compensación alegada (USD 12.000) podría reducir la condena.

**Próximos pasos:** promover prueba de informes a la contraparte sobre su registro de proveedores, testimoniales del personal que recibió el mobiliario y exhibición de la orden de compra.

_(Análisis de muestra precargado)_', 'muestra', creado_por
from legal.casos where codigo = 'LEX-2025-001';
