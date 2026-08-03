# Migración SeguimientoOnlineCore → SeguimientoOnline_New

Origen: ASP.NET Core MVC (Razor + Volt/Bootstrap + jQuery + DataTables + Leaflet).
Destino: React 19 + Vite + TypeScript + CSS Modules.

**Exhibiciones queda deprecado y no se migra.**

## Arquitectura

El MVC actuaba como intermediario: guardaba una cookie de sesión con claims
(`access_token`, `tenantDefault`, `urlApi`, `userApi`, `pwdApi`, `Permissions`,
`Modules`) y desde el servidor llamaba los API con RestSharp.

El SPA llama los API directamente:

| Capa | Antes | Ahora |
|---|---|---|
| Sesión | Cookie cifrada con claims | `AuthContext` + `sessionStorage` |
| Llamadas API Seguridad | `Helpers/Seguridad/*.cs` | `src/services/*.ts` sobre `src/api/http.ts` |
| Llamadas API por compañía | `Helpers/IBES/*.cs` | `src/services/eva/*.ts` sobre `src/api/tenantHttp.ts` |
| Layout + menú | `Views/Shared/_Layout.cshtml` | `components/layout/AppShell.tsx` + `config/navigation.tsx` |
| Autorización | `[Authorize]` + `modules.Any(...)` | `routes/ProtectedRoute.tsx` |
| Tablas | jquery.dataTables | `components/ui/DataTable.tsx` |
| Modales / confirmaciones | Bootstrap modal + SweetAlert | `components/ui/Modal.tsx`, `ConfirmDialog.tsx` |
| Selects múltiples | Choices.js | `components/ui/MultiSelect.tsx` |

### Manejo de credenciales

`TenantDto` incluye `UserAPITenant` y `PwdAPITenant`, las credenciales Basic del
API de cada compañía. **No se persisten**: `AuthContext` guarda todo lo demás en
`sessionStorage` y vuelve a pedir las compañías al API de Seguridad en cada
arranque, así las credenciales viven solo en memoria. Aun así, un XSS las
expondría — es una consecuencia conocida de que el SPA llame los API directo.

## Estado por módulo

| Módulo | Estado | Notas |
|---|---|---|
| Account (login, recuperar/reset/cambiar contraseña) | Migrado | El envío de correo por InfoBip quedó pendiente en el API — ver abajo |
| Seguridad: Compañías | Migrado | |
| Seguridad: Usuarios (alta/edición/baja) | Migrado | |
| Seguridad: Usuarios asignados | Migrado | Las dos vistas del MVC se unieron en una |
| Seguridad: Permisos y roles por permiso | Migrado | `ListRoles` es ahora un modal |
| Seguridad: Roles y módulos por rol | Migrado | |
| Seguridad: Foto de perfil | Migrado | |
| Administración: Configuración APIs | Migrado | |
| Administración: Perfiles | Migrado | |
| Administración: Auditoría | Migrado | |
| Clientes | Migrado | |
| Material POP: Entregas, Marcas, Material | Migrado | |
| Ubicaciones | Migrado | Mapa + tabla de dispositivos, vía MobiControl |
| Rutas | Migrado | Ruta planificada cruzada con lo visitado + traza GPS |
| Visitas: Consolidadas | Migrado | |
| Visitas: Efectuadas y Detalladas | Migrado | Comparten `VisitasDetalleBase` |
| Bonificados | Prototipo con mock data | Falta conectarlo a `BonificadosController` |
| Exhibiciones | **Deprecado** | No se migra |

## Pendientes

### 1. CORS (bloquea producción)

El API de Seguridad **no expone CORS**: un preflight `OPTIONS` a
`https://eva.recamier.com:8471/api/Auth/Login` responde 405 sin
`Access-Control-Allow-Origin`, y no hay configuración de CORS en `Seguridad.API`.

En desarrollo esto se resuelve con proxies de Vite (ver `vite.config.ts`):

- `/api-seguridad/...` → proxy estático al API de Seguridad.
- `/api-tenant/<base64url del destino>/...` → proxy dinámico, porque cada
  compañía tiene su propia `APIUrlTenant`.

Para producción hay que **habilitar CORS en `Seguridad.API` y en los API por
compañía** para el origen del SPA, o servir el SPA detrás de un reverse proxy
que exponga esas mismas rutas.

### 2. Envío de correos (InfoBip)

`AccountController.SendEmail` y `SeguridadController.SendEmail` mandaban el
correo de activación / recuperación usando el `APIKeyApplicationsConfig` de la
configuración "InfoBip". Ese envío **no puede hacerse desde el navegador** sin
exponer la API key. El SPA llama `Auth/ForgetPassword` y `Auth/Register`; el
envío del correo debe moverse al API.

Afecta a: recuperar contraseña y alta de usuario.

### 3. MobiControl (SOTI)

Visitas, Ubicaciones y Rutas obtienen el rastreo GPS de MobiControl. El token se
pide con usuario/clave/APIKey de la configuración "MobiControl", y el mapa usa
la API key de "GoogleMaps", ambas leídas del API de Seguridad
(`ApplicationConfig/GetValueByName`).

Decisión tomada: **el SPA sigue el mismo patrón del proyecto** — lee esas
configuraciones del API de Seguridad y llama MobiControl directamente
(`services/mobicontrolService.ts`, `hooks/useAppConfig.ts`). Consecuencias a
tener presentes:

- Las credenciales de administración de la flota viajan al navegador y quedan
  accesibles a cualquier usuario autenticado del SPA.
- En producción MobiControl debe aceptar el origen del SPA (CORS); en desarrollo
  pasa por el proxy dinámico.

### 4. "Guardar consulta" (SegOnline)

`VisitasController` y `RutasController` aceptaban `guardarConsulta` y grababan
el filtro como reporte usando `ReportHelper` contra la configuración "SegOnline".
**No se migró**: es una funcionalidad accesoria y no aparece en las vistas
migradas.

### 5. Zonas horarias

El MVC convertía las marcas de tiempo de MobiControl a la zona del tenant con
`TimeZoneInfo.FindSystemTimeZoneById(timeZone)`. El SPA las formatea con la zona
del navegador (`toLocaleString`). Si los usuarios consultan compañías en otra
zona horaria, las horas del recorrido GPS pueden diferir del MVC.

## Cambios de comportamiento respecto al MVC

- **Cambio de compañía**: era la vista `Seguridad/TenantsAssignments` y cerraba
  la sesión; ahora es un selector en la barra superior que no la cierra.
  `Tenants/AssignmentCompany` (que fija la compañía por defecto en el servidor)
  no se está llamando.
- **Rutas de Bonificados**: pasaron de la raíz a `/bonificados/...`.
- **Sin acceso**: el MVC solo ocultaba el ítem del menú; ahora además la ruta se
  bloquea y redirige a `/sin-acceso`.
- **Filtros**: la consulta corre al pulsar "Buscar" (antes era un submit que
  recargaba la página); "Limpiar" vuelve al filtro por defecto.

## Convenciones

- Los tipos conservan los nombres del API .NET (`PascalCase`, prefijos `KEY_`)
  para poder rastrearlos contra los modelos originales. Ver `types/seguridad.ts`
  y `types/eva.ts`.
- Un servicio por helper del MVC, con el mismo nombre de método donde se pudo.
- Cada página lleva un comentario que indica qué vista y qué acción del
  controller reemplaza.
