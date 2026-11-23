# LexVE · Backoffice jurídico para despachos venezolanos

Aplicación web (Next.js + Supabase + Claude) para gestionar casos, clientes, plazos procesales, documentos,
jurisprudencia del TSJ, horas, gastos y facturación, con análisis jurídico asistido por IA.

Inspirada en las mejores herramientas del mundo y adaptada a Venezuela:

| Referencia | Qué se tomó | Adaptación venezolana |
|---|---|---|
| **Clio** | Expediente central, horas, facturación por caso, informes de productividad | IVA 16 %, IGTF 3 %, tasa BCV, N.º de control, pagos por pago móvil/Zelle |
| **MyCase / PracticePanther** | Plazos con recordatorios por correo, línea de tiempo, estado de cuenta del cliente | Lapsos procesales (días de despacho), caducidad, materias LOPNNA/agraria/tributaria |
| **Harvey** | IA que analiza casos y documentos y busca jurisprudencia | Prompt jurídico venezolano (CRBV, CPC, COPP, LOTTT, COT…) y búsqueda en tsj.gob.ve |

## Funciones

- **Casos**: código interno, expediente, tribunal, circunscripción, materia, estado y etapa, prioridad, honorarios (hora, fijo, cuota litis, iguala).
- **Varios abogados por caso** con roles (responsable, colaborador, consultor, pasante). La seguridad (RLS) hace que cada abogado vea solo sus casos; socios y administradores ven todo el despacho.
- **Seguimiento (tracking)**: línea de tiempo de actuaciones (escritos, autos, audiencias, sentencias, notificaciones…).
- **Plazos y alertas por correo**: avisos configurables (p. ej. 7, 3 y 1 días antes) y aviso de vencidos, a todo el equipo del caso. Cron diario.
- **Documentos y Google Drive**: cada cliente y caso enlaza su carpeta de Drive; se listan los archivos y se vinculan al caso para analizarlos con IA (PDF y Google Docs).
- **IA (Claude)**: análisis integral, estrategia procesal, evaluación de riesgos, análisis de documentos e informe para el cliente. Todo se guarda en el historial del caso.
- **Jurisprudencia TSJ**: búsqueda con IA restringida a tsj.gob.ve (solo devuelve resultados con enlace verificable), importación de sentencias por URL con extracción automática de sala, número, ponente, resumen y doctrina, búsqueda de texto completo en español y vínculo con los casos.
- **Horas y gastos** por abogado y caso; generación automática de la factura borrador con lo pendiente.
- **Facturación**: borrador → emitida → pago parcial/pagada/vencida/anulada, pagos (transferencia, pago móvil, Zelle, efectivo, USDT), equivalente en bolívares, impresión/PDF.
- **Informes**: productividad y utilización por abogado, casos por materia y estado, cartera por cliente, exportación CSV, informe imprimible de cada caso.

## Base de datos (Supabase)

Creada en el proyecto `ubcqgcgyjslrrewhrjrn` (organización legalmenteapp@grupolemonde.io), dentro del esquema **`legal`** (separado del esquema `public`, que usa otra aplicación).
Archivos: `supabase/migrations/0001_esquema_legal.sql` (17 tablas, vistas, funciones, triggers y políticas RLS) y `supabase/seed.sql` (datos de prueba ya cargados). `0002_trabajos_ia.sql` añade la tabla de trabajos de IA (necesaria para Netlify).

**Paso obligatorio una sola vez:** en Supabase → *Project Settings → Data API → Exposed schemas*, añade `legal` y guarda. Sin esto la API responde “schema must be one of …”.

### Usuarios de prueba (contraseña `LexVE-Demo-2026!`)

| Correo | Rol | Ve |
|---|---|---|
| socia@lexve.demo | Socia | Todo el despacho, facturación y alertas |
| carlos@lexve.demo | Abogado | Solo sus casos |
| andreina@lexve.demo | Abogada | Solo sus casos |
| josegregorio@lexve.demo | Abogado | Solo sus casos |
| asistente@lexve.demo | Asistente / pasante | Casos donde está asignada |

Datos ficticios: 10 clientes, 12 casos de distintas materias, 25 actuaciones, 14 plazos (relativos a la fecha de carga), 6 documentos con texto, ~100 registros de horas, 7 gastos, 9 facturas con pagos. Las 5 sentencias “EJEMPLO-00x” son ilustrativas, no reales: reemplázalas importando sentencias del TSJ.

## Puesta en marcha

```bash
cp .env.example .env.local   # completa las variables
npm install
npm run dev                  # http://localhost:3000
```

Variables (ver `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ya rellenadas), `SUPABASE_SERVICE_ROLE_KEY` (para el cron de alertas).
- `ANTHROPIC_API_KEY` y opcionalmente `CLAUDE_MODEL` (por defecto `claude-opus-5-5`, con respaldo automático si el modelo rechaza una solicitud).
- `GOOGLE_SERVICE_ACCOUNT_JSON`: cuenta de servicio de Google Cloud con la API de Drive activada. Cada cliente comparte su carpeta (lector) con el correo de esa cuenta.
- `RESEND_API_KEY`, `ALERTAS_REMITENTE`, `ALERTAS_ENVIO_REAL`: mientras `ALERTAS_ENVIO_REAL` no sea `true`, las alertas se registran como **simuladas** y no se envía ningún correo.
- `CRON_SECRET`: protege `/api/cron/alertas`.

### Despliegue en Netlify (recomendado)
1. Sube el código a GitHub y en Netlify elige **Add new site → Import an existing project** con ese repositorio.
   Netlify lee `netlify.toml` (build `npm run build`, Node 22) y detecta Next.js automáticamente.
2. En **Site configuration → Environment variables** añade todas las variables de `.env.example`
   (`CRON_SECRET` es obligatoria: sin ella la IA no arranca). `NEXT_PUBLIC_APP_URL` = la URL del sitio.
3. Aplica en Supabase la migración `supabase/migrations/0002_trabajos_ia.sql` (tabla de trabajos de IA).
4. Despliega. Las funciones propias están en `netlify/functions/`:
   - `trabajo-ia-background.mts`: ejecuta los análisis de Claude, la búsqueda y la importación del TSJ en
     segundo plano (hasta 15 min). **Requiere un plan de Netlify con Background Functions (Pro o superior).**
   - `alertas-diarias.mts`: alertas por correo cada día a las 11:00 UTC (7:00 a. m. en Caracas).

**Por qué en segundo plano:** en Netlify las funciones normales se cortan a los 10 s (26 s como máximo pidiéndolo
a soporte) y un análisis con Claude tarda más. La ruta crea un trabajo en `legal.trabajos_ia`, la función en
segundo plano lo procesa y la pantalla consulta `/api/ia/trabajos/[id]` hasta que termina.
En local (`npm run dev`) y en Vercel se procesa en la misma petición con `after()`, sin cambiar nada.

### Despliegue en Vercel (alternativa)
1. Importa el repositorio en Vercel y copia las variables de entorno.
2. `vercel.json` programa el cron diario de alertas (11:00 UTC = 7:00 a. m. en Caracas).
3. Las rutas de IA tienen `maxDuration = 300` s (requiere plan con funciones largas o Fluid Compute).

## Estructura

```
src/app/(app)/          páginas: panel, casos, clientes, tsj, facturacion, informes, alertas
src/app/(app)/acciones.ts   server actions (CRUD, facturación, alertas)
src/app/api/            ia/analizar, ia/trabajos/[id], tsj/buscar, tsj/importar, drive/*, cron/alertas, informes/csv
src/lib/trabajos.ts     trabajos de IA (análisis, búsqueda e importación TSJ) que corren en segundo plano
netlify/functions/      función de IA en segundo plano y alertas programadas (Netlify)
src/lib/ia.ts           llamadas a Claude (análisis, extracción de sentencias, búsqueda TSJ)
src/lib/tsj.ts          descarga y limpieza de sentencias de tsj.gob.ve
src/lib/drive.ts        Google Drive (cuenta de servicio)
src/lib/alertas.ts      motor de alertas por correo (idempotente)
supabase/               migración y datos de prueba
```

## Próximos pasos sugeridos
- Portal del cliente (acceso de solo lectura a sus casos y facturas).
- Calendario de días de despacho por tribunal para calcular lapsos automáticamente.
- Plantillas de escritos (poder, demanda, contestación) generadas con IA a partir del expediente.
- Integración de la tasa BCV automática y facturación electrónica conforme a la normativa SENIAT vigente.
