import { useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { Field } from "../../components/ui/Field";
import { useApi } from "../../hooks/useApi";
import { audithService } from "../../services/audithService";
import { usuariosService } from "../../services/usuariosService";
import { formatDateTime, hoyISO, rangoDelDia } from "../../utils/dates";
import type { AudithE } from "../../types/seguridad";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "../seguridad/Formularios.module.css";

/** Migra Views/Auditoria/Index.cshtml. */
export function AuditoriaPage() {
  const usuarios = useApi(() => usuariosService.getList());

  // El controller arrancaba con el dia de hoy en ambos extremos.
  const [fecIni, setFecIni] = useState(hoyISO());
  const [fecFin, setFecFin] = useState(hoyISO());
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  // Filtro aplicado: la consulta solo corre al pulsar Buscar, como el submit del MVC.
  const [filtro, setFiltro] = useState({ fecIni: hoyISO(), fecFin: hoyISO(), usuarios: [] as string[] });

  const registros = useApi(() => {
    // Sin seleccion, el controller mandaba todos los correos.
    const todos = (usuarios.datos ?? []).map((u) => u.Email);
    const lista = filtro.usuarios.length ? filtro.usuarios : todos;
    if (!lista.length) return Promise.resolve([]);
    return audithService.list({
      Usuarios: lista,
      FecIni: rangoDelDia(filtro.fecIni),
      FecFin: rangoDelDia(filtro.fecFin, true),
    });
  }, [filtro, usuarios.datos]);

  const columnas: Columna<AudithE>[] = [
    {
      titulo: "Usuario",
      valor: (a) => a.UserName,
      render: (a) => <strong>{a.UserName}</strong>,
    },
    { titulo: "Módulo", valor: (a) => a.Module, render: (a) => a.Module },
    {
      titulo: "Fecha",
      valor: (a) => a.CreatedDate,
      render: (a) => formatDateTime(a.CreatedDate),
      ancho: "13rem",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Auditoría"
        description="Accesos registrados por usuario y módulo."
        actions={<Badge tone="accent">{registros.datos?.length ?? 0} registros</Badge>}
      />

      <div className={formularios.filtros}>
        <Field label="Desde" htmlFor="fecIni">
          <input
            id="fecIni"
            type="date"
            className={inputs.input}
            value={fecIni}
            onChange={(evento) => setFecIni(evento.target.value)}
          />
        </Field>

        <Field label="Hasta" htmlFor="fecFin">
          <input
            id="fecFin"
            type="date"
            className={inputs.input}
            value={fecFin}
            onChange={(evento) => setFecFin(evento.target.value)}
          />
        </Field>

        <Field label="Usuarios" htmlFor="usuarios" hint="Sin selección se consultan todos.">
          <select
            id="usuarios"
            multiple
            size={4}
            className={inputs.select}
            value={seleccionados}
            onChange={(evento) =>
              setSeleccionados(Array.from(evento.target.selectedOptions, (o) => o.value))
            }
          >
            {usuarios.datos?.map((u) => (
              <option key={u.Id} value={u.Email}>
                {u.FirstName} {u.LastName}
              </option>
            ))}
          </select>
        </Field>

        <Button
          variant="primary"
          onClick={() => setFiltro({ fecIni, fecFin, usuarios: seleccionados })}
        >
          Buscar
        </Button>
      </div>

      <DataTable
        columnas={columnas}
        filas={registros.datos}
        claveFila={(a) => String(a.AudithId)}
        cargando={registros.cargando || usuarios.cargando}
        error={registros.error}
        vacio="No hay registros en el rango seleccionado."
        porPagina={25}
      />
    </>
  );
}
