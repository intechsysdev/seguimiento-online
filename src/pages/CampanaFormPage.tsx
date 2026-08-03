import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { Switch } from "../components/ui/Switch";
import inputStyles from "../components/ui/inputs.module.css";
import { useBonificados } from "../store/BonificadosContext";
import styles from "./CampanaFormPage.module.css";

export function CampanaFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { getCampana, addCampana, updateCampana } = useBonificados();
  const existing = isEdit ? getCampana(id!) : undefined;

  const [nombre, setNombre] = useState(existing?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(existing?.descripcion ?? "");
  const [fechaInicio, setFechaInicio] = useState(existing?.fechaInicio ?? new Date().toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState(
    existing?.fechaFin ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  );
  const [activa, setActiva] = useState(existing?.activa ?? true);
  const [error, setError] = useState("");

  if (isEdit && !existing) {
    return <p>Campaña no encontrada.</p>;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre de la campaña es obligatorio.");
      return;
    }
    if (fechaFin < fechaInicio) {
      setError("La fecha de fin debe ser posterior a la fecha de inicio.");
      return;
    }

    if (existing) {
      updateCampana({ ...existing, nombre, descripcion, fechaInicio, fechaFin, activa });
      navigate("/bonificados");
    } else {
      const nueva = addCampana({ nombre, descripcion, fechaInicio, fechaFin, activa });
      navigate(`/bonificados/campanas/${nueva.id}`);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Bonificados"
        title={isEdit ? "Editar campaña" : "Nueva campaña"}
        backTo="/bonificados"
        backLabel="Campañas"
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <Field label="Nombre de la campaña" htmlFor="nombre">
          <input
            id="nombre"
            className={inputStyles.input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Campaña Tintes Abril 2026"
          />
        </Field>

        <Field label="Descripción" optional htmlFor="descripcion">
          <textarea
            id="descripcion"
            className={inputStyles.textarea}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Objetivo de la campaña, línea de negocio, etc."
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
          <Field label="Fecha de fin" htmlFor="fechaFin">
            <input
              id="fechaFin"
              type="date"
              className={inputStyles.input}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </Field>
        </div>

        <div className={styles.switchRow}>
          <Switch
            checked={activa}
            onChange={setActiva}
            label="Campaña activa"
            hint="Solo las campañas activas y vigentes se evalúan en la app móvil."
          />
        </div>

        {error && <span className={styles.error}>{error}</span>}

        <div className={styles.actions}>
          <Button type="submit" variant="primary">
            {isEdit ? "Guardar cambios" : "Crear campaña"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/bonificados")}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );
}
