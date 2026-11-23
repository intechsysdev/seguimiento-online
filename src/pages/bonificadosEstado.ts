import type { Campana } from "../types/bonificados";
import { soloFecha } from "../types/bonificados";
import { estadoVigencia } from "../utils/dates";

type Tono = "success" | "warning" | "neutral" | "tier";

const VIGENCIA: Record<
  ReturnType<typeof estadoVigencia>,
  { label: string; tone: Tono }
> = {
  vigente: { label: "Vigente", tone: "success" },
  "por-vencer": { label: "Vence pronto", tone: "warning" },
  "no-vigente": { label: "Finalizada", tone: "neutral" },
  programada: { label: "Programada", tone: "tier" },
};

/** Etiqueta de la campaña: el estado manda sobre las fechas. */
export function estadoDeCampana(
  campana: Pick<Campana, "estado" | "fechaInicio" | "fechaFin">,
) {
  if (campana.estado === "B")
    return { label: "Borrador", tone: "neutral" as Tono };
  if (campana.estado === "I")
    return { label: "Inactiva", tone: "neutral" as Tono };
  return VIGENCIA[
    estadoVigencia(
      soloFecha(campana.fechaInicio),
      soloFecha(campana.fechaFin),
      true,
    )
  ];
}
