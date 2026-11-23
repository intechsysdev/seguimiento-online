import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Spinner } from "../components/ui/Spinner";
import {
  IconChevronRight,
  IconCopy,
  IconEdit,
  IconGift,
  IconPlus,
  IconTrash,
} from "../components/icons";
import { useApi } from "../hooks/useApi";
import { bonificadosService } from "../services/eva/bonificadosService";
import { useAuth } from "../store/AuthContext";
import { soloFecha, type Campana } from "../types/bonificados";
import { diasRestantes, formatDate, progresoVigencia } from "../utils/dates";
import { estadoDeCampana } from "./bonificadosEstado";
import styles from "./CampanasPage.module.css";

export function CampanasPage() {
  const { session, tenant } = useAuth();
  const cmpy = session?.tenantActual ?? "";
  const usuario = session?.username ?? "";
  const navigate = useNavigate();

  const campanas = useApi(
    () =>
      tenant && cmpy
        ? bonificadosService.campanas(tenant, cmpy)
        : Promise.resolve([]),
    [tenant?.IDTenant, cmpy],
  );

  const [aEliminar, setAEliminar] = useState<Campana | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function eliminar() {
    if (!aEliminar || !tenant) return;
    const campana = aEliminar;
    setAEliminar(null);
    setOcupado(campana.codigo);
    setError(null);
    try {
      await bonificadosService.eliminarCampana(
        tenant,
        cmpy,
        campana.codigo,
        usuario,
      );
      campanas.recargar();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo eliminar la campaña.",
      );
    } finally {
      setOcupado(null);
    }
  }

  async function duplicar(campana: Campana) {
    if (!tenant) return;
    setOcupado(campana.codigo);
    setError(null);
    try {
      const copia = await bonificadosService.duplicarCampana(
        tenant,
        cmpy,
        campana.codigo,
        usuario,
      );
      navigate(
        `/bonificados/campanas/${encodeURIComponent(copia.codigo)}/editar`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo duplicar la campaña.",
      );
      setOcupado(null);
    }
  }

  const lista = campanas.datos ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Bonificados"
        title="Campañas"
        description="Cada campaña agrupa una o varias reglas de bonificación vigentes durante un período."
        actions={
          <Button
            variant="primary"
            onClick={() => navigate("/bonificados/campanas/nueva")}
          >
            <IconPlus width={16} height={16} />
            Nueva campaña
          </Button>
        }
      />

      {error ? <Alert tone="critical">{error}</Alert> : null}

      {campanas.cargando && !campanas.datos ? (
        <Spinner />
      ) : campanas.error ? (
        <Alert tone="critical">
          No se pudieron cargar las campañas: {campanas.error}
        </Alert>
      ) : lista.length === 0 ? (
        <EmptyState
          icon={<IconGift />}
          title="No hay campañas de bonificación"
          description="Crea tu primera campaña para comenzar a definir reglas de bonificación para la fuerza de ventas."
          action={
            <Button
              variant="primary"
              onClick={() => navigate("/bonificados/campanas/nueva")}
            >
              <IconPlus width={16} height={16} />
              Crear primera campaña
            </Button>
          }
        />
      ) : (
        <div className={styles.grid}>
          {lista.map((campana) => {
            const estado = estadoDeCampana(campana);
            const inicio = soloFecha(campana.fechaInicio);
            const fin = soloFecha(campana.fechaFin);
            const progreso = progresoVigencia(inicio, fin);
            const restantes = diasRestantes(fin);
            const ruta = `/bonificados/campanas/${encodeURIComponent(campana.codigo)}`;

            return (
              <article key={campana.codigo} className={styles.card}>
                <div className={styles.cardTop}>
                  <h3 className={styles.name}>{campana.nombre}</h3>
                  <Badge tone={estado.tone} dot>
                    {estado.label}
                  </Badge>
                </div>

                <p className={styles.desc}>
                  {campana.codigo}
                  {campana.origen ? ` · copia de ${campana.origen}` : ""}
                </p>

                <div className={styles.vigencia}>
                  <ProgressBar
                    value={progreso}
                    max={100}
                    tone={estado.tone === "warning" ? "warning" : "accent"}
                  />
                  <div className={styles.vigenciaRow}>
                    <span className={`tabular ${styles.dates}`}>
                      {formatDate(inicio)} — {formatDate(fin)}
                    </span>
                    <span>
                      {restantes >= 0
                        ? `${restantes}d restantes`
                        : "finalizada"}
                    </span>
                  </div>
                </div>

                <div className={styles.footer}>
                  <Link to={ruta} className={styles.reglasLink}>
                    {campana.totalReglas} regla
                    {campana.totalReglas === 1 ? "" : "s"}
                    <IconChevronRight width={15} height={15} />
                  </Link>
                  <div className={styles.rowActions}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => duplicar(campana)}
                      disabled={ocupado !== null}
                      aria-label="Duplicar campaña"
                      title="Duplicar con sus reglas"
                    >
                      <IconCopy width={16} height={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`${ruta}/editar`)}
                      disabled={ocupado !== null}
                      aria-label="Editar campaña"
                    >
                      <IconEdit width={16} height={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAEliminar(campana)}
                      disabled={ocupado !== null}
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
        open={aEliminar !== null}
        title={`¿Eliminar "${aEliminar?.nombre}"?`}
        message="Se eliminará la campaña junto con todas sus reglas. Si alguna regla ya bonificó pedidos no se podrá eliminar: en ese caso inactívala."
        onCancel={() => setAEliminar(null)}
        onConfirm={eliminar}
      />
    </>
  );
}
