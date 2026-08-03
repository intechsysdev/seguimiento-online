import { VisitasDetalleBase } from "./VisitasDetalleBase";

/** Migra Views/Visitas/SummaryGroup.cshtml (menú "Efectuadas"). */
export function EfectuadasPage() {
  return (
    <VisitasDetalleBase
      modo="agrupada"
      titulo="Efectuadas"
      descripcion="Visitas agrupadas por cliente, con los documentos generados."
    />
  );
}
