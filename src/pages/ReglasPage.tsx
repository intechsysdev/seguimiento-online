import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { ProgressBar } from "../components/ui/ProgressBar";
import { IconEdit, IconLayers, IconPlus, IconTrash } from "../components/icons";
import { useBonificados } from "../store/BonificadosContext";
import { estadoVigencia, formatDate } from "../utils/dates";
import type { Regla } from "../types/bonificados";
import styles from "./ReglasPage.module.css";

const ESTADO_INFO = {
  vigente: { label: "Vigente", tone: "success" as const },
  "por-vencer": { label: "Vence pronto", tone: "warning" as const },
  "no-vigente": { label: "Finalizada", tone: "neutral" as const },
  programada: { label: "Programada", tone: "tier" as const },
};

const AGRUPACION_LABEL: Record<Regla["tipoAgrupacion"], string> = {
  PRODUCTO: "Producto específico",
  LINEA: "Línea",
  SUBLINEA: "Sublínea",
  GRUPO_MIXTO: "Grupo mixto",
};

function describeCondicion(regla: Regla) {
  if (regla.usaEscalonamiento) {
    const primero = regla.niveles[0];
    return `Nivel 1 desde ${primero?.cantidadMinima ?? "—"} uds`;
  }
  if (regla.cantidadMinima) return `Cantidad mínima: ${regla.cantidadMinima}`;
  if (regla.montoMinimo) return `Monto mínimo: $${regla.montoMinimo.toLocaleString()}`;
  return "Sin condición mínima";
}

export function ReglasPage() {
  const { campanaId } = useParams();
  const navigate = useNavigate();
  const { getCampana, getReglasDeCampana, deleteRegla } = useBonificados();
  const [toDelete, setToDelete] = useState<{ id: string; nombre: string } | null>(null);

  const campana = getCampana(campanaId!);
  if (!campana) return <Navigate to="/" replace />;

  const reglas = getReglasDeCampana(campana.id);
  const estado = ESTADO_INFO[estadoVigencia(campana.fechaInicio, campana.fechaFin, campana.activa)];

  return (
    <>
      <PageHeader
        eyebrow="Bonificados"
        title={campana.nombre}
        backTo="/"
        backLabel="Campañas"
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(`/campanas/${campana.id}/editar`)}>
              <IconEdit width={16} height={16} />
              Editar campaña
            </Button>
            <Button variant="primary" onClick={() => navigate(`/campanas/${campana.id}/reglas/nueva`)}>
              <IconPlus width={16} height={16} />
              Nueva regla
            </Button>
          </>
        }
      />

      <div className={styles.campaignBar}>
        <div className={styles.campaignInfo}>
          <Badge tone={estado.tone} dot>
            {estado.label}
          </Badge>
          <span className={`tabular ${styles.campaignDates}`}>
            {formatDate(campana.fechaInicio)} — {formatDate(campana.fechaFin)}
          </span>
        </div>
        <span className={styles.campaignDates}>
          {reglas.length} regla{reglas.length === 1 ? "" : "s"}
        </span>
      </div>

      {reglas.length === 0 ? (
        <EmptyState
          icon={<IconLayers />}
          title="Esta campaña aún no tiene reglas"
          description="Crea la primera regla para definir cómo se bonificarán los pedidos de esta campaña."
          action={
            <Button variant="primary" onClick={() => navigate(`/campanas/${campana.id}/reglas/nueva`)}>
              <IconPlus width={16} height={16} />
              Crear primera regla
            </Button>
          }
        />
      ) : (
        <div className={styles.list}>
          {reglas.map((regla) => {
            const reglaEstado = regla.activa
              ? { label: "Activa", tone: "success" as const }
              : { label: "Inactiva", tone: "neutral" as const };

            return (
              <article key={regla.id} className={styles.row}>
                <div className={styles.main}>
                  <h3 className={styles.name}>{regla.nombreRegla}</h3>
                  {regla.descripcion && <p className={styles.desc}>{regla.descripcion}</p>}
                  <div className={styles.badgeRow}>
                    <Badge tone="accent">{AGRUPACION_LABEL[regla.tipoAgrupacion]}</Badge>
                    {regla.usaEscalonamiento && <Badge tone="tier">{regla.niveles.length} niveles</Badge>}
                    {regla.limiteMensualActivo && <Badge tone="warning">Límite mensual</Badge>}
                    {regla.canales.map((c) => (
                      <Badge key={c}>{c}</Badge>
                    ))}
                  </div>
                </div>

                <div className={styles.condicion}>
                  <strong>Condición</strong>
                  <br />
                  {describeCondicion(regla)}
                </div>

                <div>
                  {regla.stockAsignado ? (
                    <>
                      <div className={styles.stockLabel}>
                        <span>Stock</span>
                        <span className="tabular">
                          {regla.stockConsumido}/{regla.stockAsignado}
                        </span>
                      </div>
                      <ProgressBar value={regla.stockConsumido} max={regla.stockAsignado} tone="tier" />
                    </>
                  ) : (
                    <span className={styles.condicion}>Stock sin límite</span>
                  )}
                </div>

                <div className={styles.actions}>
                  <Badge tone={reglaEstado.tone} dot>
                    {reglaEstado.label}
                  </Badge>
                  <div className={styles.rowActions}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/campanas/${campana.id}/reglas/${regla.id}`)}
                      aria-label="Editar regla"
                    >
                      <IconEdit width={16} height={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setToDelete({ id: regla.id, nombre: regla.nombreRegla })}
                      aria-label="Eliminar regla"
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
        message="La regla dejará de evaluarse en la app móvil de inmediato. Esta acción no se puede deshacer."
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteRegla(toDelete.id);
          setToDelete(null);
        }}
      />
    </>
  );
}
