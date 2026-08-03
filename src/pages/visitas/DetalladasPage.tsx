import { VisitasDetalleBase } from "./VisitasDetalleBase";

/** Migra Views/Visitas/Summary.cshtml (menú "Detalladas"). */
export function DetalladasPage() {
  return (
    <VisitasDetalleBase
      modo="detallada"
      titulo="Detalladas"
      descripcion="Una fila por movimiento, con medio, motivo y acción."
    />
  );
}
