import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { Spinner } from "../components/ui/Spinner";
import inputStyles from "../components/ui/inputs.module.css";
import { useApi } from "../hooks/useApi";
import { bonificadosService } from "../services/eva/bonificadosService";
import { useAuth } from "../store/AuthContext";
import { soloFecha, type EstadoCampana } from "../types/bonificados";
import { hoyISO } from "../utils/dates";
import styles from "./CampanaFormPage.module.css";

const ESTADOS: { valor: EstadoCampana; etiqueta: string }[] = [
  { valor: "B", etiqueta: "Borrador: se puede preparar sin que la app la vea" },
  { valor: "A", etiqueta: "Activa: la app la evalúa durante su vigencia" },
  { valor: "I", etiqueta: "Inactiva: suspendida" },
];

function dentroDeUnMes() {
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() + 1);
  fecha.setDate(fecha.getDate() - 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

export function CampanaFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { session, tenant } = useAuth();
  const cmpy = session?.tenantActual ?? "";

  const existente = useApi(
    () =>
      isEdit && tenant && cmpy
        ? bonificadosService.campana(tenant, cmpy, id!)
        : Promise.resolve(undefined),
    [tenant?.IDTenant, cmpy, id],
  );

  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState(hoyISO());
  const [fechaFin, setFechaFin] = useState(dentroDeUnMes());
  const [estado, setEstado] = useState<EstadoCampana>("B");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const c = existente.datos;
    if (!c) return;
    setNombre(c.nombre);
    setFechaInicio(soloFecha(c.fechaInicio));
    setFechaFin(soloFecha(c.fechaFin));
    setEstado(c.estado);
  }, [existente.datos]);

  if (isEdit && existente.cargando) return <Spinner />;
  if (isEdit && (existente.error || !existente.datos)) {
    return (
      <Alert tone="critical">
        No se pudo cargar la campaña: {existente.error ?? "no existe"}
      </Alert>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    if (!nombre.trim()) {
      setError("El nombre de la campaña es obligatorio.");
      return;
    }
    if (fechaFin < fechaInicio) {
      setError(
        "La fecha de fin debe ser igual o posterior a la fecha de inicio.",
      );
      return;
    }

    setError("");
    setGuardando(true);
    const datos = {
      cmpy,
      codigo: id,
      nombre: nombre.trim(),
      fechaInicio,
      fechaFin,
      estado,
      usuario: session?.username ?? "",
    };
    try {
      if (isEdit) {
        await bonificadosService.actualizarCampana(tenant, datos);
        navigate(`/bonificados/campanas/${encodeURIComponent(id!)}`);
      } else {
        const nueva = await bonificadosService.crearCampana(tenant, datos);
        navigate(`/bonificados/campanas/${encodeURIComponent(nueva.codigo)}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la campaña.",
      );
      setGuardando(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={isEdit ? `Bonificados · ${id}` : "Bonificados"}
        title={isEdit ? "Editar campaña" : "Nueva campaña"}
        backTo="/bonificados"
        backLabel="Campañas"
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <Field
          label="Nombre de la campaña"
          htmlFor="nombre"
          hint="El código se asigna solo al guardar."
        >
          <input
            id="nombre"
            className={inputStyles.input}
            value={nombre}
            maxLength={150}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Campaña Tintes Abril 2026"
          />
        </Field>

        <div className={styles.row}>
          <Field label="Fecha de inicio" htmlFor="fechaInicio">
            <input
              id="fechaInicio"
              type="date"
              className={inputStyles.input}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </Field>
          <Field
            label="Fecha de fin"
            htmlFor="fechaFin"
            hint="Incluye el día completo."
          >
            <input
              id="fechaFin"
              type="date"
              className={inputStyles.input}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Estado" htmlFor="estado">
          <select
            id="estado"
            className={inputStyles.select}
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoCampana)}
          >
            {ESTADOS.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </Field>

        {error && <span className={styles.error}>{error}</span>}

        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={guardando}>
            {guardando
              ? "Guardando…"
              : isEdit
                ? "Guardar cambios"
                : "Crear campaña"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/bonificados")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );
}
