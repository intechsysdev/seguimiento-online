import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { ProgressBar } from "../components/ui/ProgressBar";
import { IconChevronRight, IconEdit, IconGift, IconPlus, IconTrash } from "../components/icons";
import { useBonificados } from "../store/BonificadosContext";
import { diasRestantes, estadoVigencia, formatDate, progresoVigencia } from "../utils/dates";
import styles from "./CampanasPage.module.css";

const ESTADO_INFO = {
  vigente: { label: "Vigente", tone: "success" as const },
  "por-vencer": { label: "Vence pronto", tone: "warning" as const },
  "no-vigente": { label: "Finalizada", tone: "neutral" as const },
  programada: { label: "Programada", tone: "tier" as const },
};

export function CampanasPage() {
  const { campanas, getReglasDeCampana, deleteCampana } = useBonificados();
  const navigate = useNavigate();
  const [toDelete, setToDelete] = useState<{ id: string; nombre: string } | null>(null);

  const campanasOrdenadas = [...campanas].sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));

  return (
    <>
      <PageHeader
        eyebrow="Bonificados"
        title="Campañas"
        description="Cada campaña agrupa una o varias reglas de bonificación vigentes durante un período."
        actions={
          <Button variant="primary" onClick={() => navigate("/campanas/nueva")}>
            <IconPlus width={16} height={16} />
            Nueva campaña
          </Button>
        }
      />

      {campanasOrdenadas.length === 0 ? (
        <EmptyState
          icon={<IconGift />}
          title="No hay campañas de bonificación"
          description="Crea tu primera campaña para comenzar a definir reglas de bonificación para la fuerza de ventas."
          action={
            <Button variant="primary" onClick={() => navigate("/campanas/nueva")}>
              <IconPlus width={16} height={16} />
              Crear primera campaña
            </Button>
          }
        />
      ) : (
        <div className={styles.grid}>
          {campanasOrdenadas.map((campana) => {
            const estado = ESTADO_INFO[estadoVigencia(campana.fechaInicio, campana.fechaFin, campana.activa)];
            const progreso = progresoVigencia(campana.fechaInicio, campana.fechaFin);
            const restantes = diasRestantes(campana.fechaFin);
            const totalReglas = getReglasDeCampana(campana.id).length;

            return (
              <article key={campana.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <h3 className={styles.name}>{campana.nombre}</h3>
                  <Badge tone={estado.tone} dot>
                    {estado.label}
                  </Badge>
                </div>

                {campana.descripcion && <p className={styles.desc}>{campana.descripcion}</p>}

                <div className={styles.vigencia}>
                  <ProgressBar value={progreso} max={100} tone={estado.tone === "warning" ? "warning" : "accent"} />
                  <div className={styles.vigenciaRow}>
                    <span className={`tabular ${styles.dates}`}>
                      {formatDate(campana.fechaInicio)} — {formatDate(campana.fechaFin)}
                    </span>
                    <span>{restantes >= 0 ? `${restantes}d restantes` : "finalizada"}</span>
                  </div>
                </div>

                <div className={styles.footer}>
                  <Link to={`/campanas/${campana.id}`} className={styles.reglasLink}>
                    {totalReglas} regla{totalReglas === 1 ? "" : "s"}
                    <IconChevronRight width={15} height={15} />
                  </Link>
                  <div className={styles.rowActions}>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/campanas/${campana.id}/editar`)} aria-label="Editar campaña">
                      <IconEdit width={16} height={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setToDelete({ id: campana.id, nombre: campana.nombre })}
                      aria-label="Eliminar campaña"
                    >
                      <IconTrash width={16} height={16} />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`¿Eliminar "${toDelete?.nombre}"?`}
        message="Se eliminará la campaña junto con todas sus reglas de bonificación. Esta acción no se puede deshacer."
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteCampana(toDelete.id);
          setToDelete(null);
        }}
      />
    </>
  );
}
