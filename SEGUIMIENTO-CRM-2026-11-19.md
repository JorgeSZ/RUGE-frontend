# CRM — estado de implementación

Repos: API /Users/jorge/Code/Ruge_API; UI /Users/jorge/Code/RUGE-frontend/ruge-admin. No cambios mobile.

Implementado: perfiles por iglesia, asistencias históricas independientes de eventos, notas con autor/fecha e idempotencia, paginación y filtros servidor, UI bajo Consolidación, registro automático transaccional desde ParticipantRepository, consulta global de cédula del CRM en validación de reinscripción con correo existente. Acceso Admin/Coordinador/GlobalAdmin con iglesia seleccionada. Campos ausentes permitidos; LGND separado de cédula.

Migración: 20261119051713_AddChurchCrm. No se ha aplicado ninguna migración ni importación a la base real. No commits ni despliegues.

Entregables privados (fuera de los repositorios):
/Users/jorge/.codex/visualizations/2026/10/09/01a12316-4e29-7cb0-86a3-84afb9739653/crm-2026-11-19

Incluye LEEME.md, 01_esquema_crm.sql, 02_senderistas_existentes.sql, 03_historico_excel.sql, Filas_para_revision.xlsx. Fuente Excel BD SIST-RUGE 2026.xlsx: 2203 filas; 60 excluidas completamente; 2143 asistencias / 2140 perfiles aptos; 789 filas aptas sin ambos identificadores. Tenant destino Impact Global Costa Rica a5e58b8e-94c4-4a9f-8d46-7ca82e9469d1; conservar Iglesia del Excel como afiliación personal. No adivinar datos ni autoimportar las 60 filas dudosas.

Pruebas: API tests/Ruge.CrmChecks y tests/migrations/check_crm.py en MySQL temporal aislado; UI crm.component.spec.ts (5 pruebas); build API y producción Angular. Información técnica en API/docs/CRM.md. Los scripts de importación se repiten sin duplicados y no reemplazan fichas existentes. Las coincidencias ambiguas contra la base se reportan y omiten.

Falta que Jorge revise las filas excluidas, ejecute los scripts manualmente y pruebe con su sesión real después del despliegue. Revisar registros de pruebas /tmp/crm-tests.log, /tmp/crm-ui-tests.log, /tmp/crm-registration-regression.log si continúa esta sesión.
