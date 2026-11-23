import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Spinner } from "../components/ui/Spinner";
import { IconEdit, IconLayers, IconPlus, IconTrash } from "../components/icons";
import { useApi } from "../hooks/useApi";
import { bonificadosService } from "../services/eva/bonificadosService";
import { useAuth } from "../store/AuthContext";
import { soloFecha, type Regla } from "../types/bonificados";
import { formatDate } from "../utils/dates";
import { estadoDeCampana } from "./bonificadosEstado";
import styles from "./ReglasPage.module.css";

const AGRUPACION_LABEL: Record<Regla["agrupacion"], string> = {
  PRODUCTO: "Productos",
  LINEA: "Líneas",
  SUBLINEA: "Sublíneas",
  GRUPO_MIXTO: "Grupo mixto",
};

const numero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

function describirCondicion(regla: Regla) {
  const unidad = (valor: number) =>
    regla.medida === "MONTO"
      ? `$${numero.format(valor)}`
      : `${numero.format(valor)} uds`;
  if (regla.usaEscalonamiento) {
    const primero = regla.niveles[0];
    return `${regla.niveles.length} niveles desde ${primero ? unidad(primero.desde) : "—"}`;
  }
  const partes = [];
  if (regla.cantidadMinima)
    partes.push(`${numero.format(regla.cantidadMinima)} uds`);
  if (regla.montoMinimo) partes.push(`$${numero.format(regla.montoMinimo)}`);
  return partes.length
    ? `Mínimo ${partes.join(" y ")}`
    : "Sin condición mínima";
}

export function ReglasPage() {
  const { campanaId } = useParams();
  const navigate = useNavigate();
  const { session, tenant } = useAuth();
  const cmpy = session?.tenantActual ?? "";
  const codigoCampana = campanaId ?? "";
  const rutaCampana = `/bonificados/campanas/${encodeURIComponent(codigoCampana)}`;

  const datos = useApi(async () => {
    if (!tenant || !cmpy) return undefined;
    const [campana, reglas] = await Promise.all([
      bonificadosService.campana(tenant, cmpy, codigoCampana),
      bonificadosService.reglas(tenant, cmpy, codigoCampana),
    ]);
    return { campana, reglas };
  }, [tenant?.IDTenant, cmpy, codigoCampana]);

  const [aEliminar, setAEliminar] = useState<Regla | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (datos.cargando && !datos.datos) return <Spinner />;
  if (datos.error || !datos.datos) {
    return (
      <Alert tone="critical">
        No se pudo cargar la campaña: {datos.error ?? "sin compañía activa"}
      </Alert>
    );
  }

  const { campana, reglas } = datos.datos;
  const estado = estadoDeCampana(campana);

  async function eliminar() {
    if (!aEliminar?.codigo || !tenant) return;
    const regla = aEliminar;
    setAEliminar(null);
    setError(null);
    try {
      await bonificadosService.eliminarRegla(
        tenant,
        cmpy,
        regla.codigo!,
        session?.username ?? "",
      );
      datos.recargar();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo eliminar la regla.",
      );
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`Bonificados · ${campana.codigo}`}
        title={campana.nombre}
        backTo="/bonificados"
        backLabel="Campañas"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate(`${rutaCampana}/editar`)}
            >
              <IconEdit width={16} height={16} />
              Editar campaña
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(`${rutaCampana}/reglas/nueva`)}
            >
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
            {formatDate(soloFecha(campana.fechaInicio))} —{" "}
            {formatDate(soloFecha(campana.fechaFin))}
          </span>
        </div>
        <span className={styles.campaignDates}>
          {reglas.length} regla{reglas.length === 1 ? "" : "s"}
        </span>
      </div>

      {campana.estado === "B" && reglas.length > 0 ? (
        <Alert tone="info">
          La campaña está en borrador: la app no verá estas reglas hasta que la
          actives.
        </Alert>
      ) : null}
      {error ? <Alert tone="critical">{error}</Alert> : null}

      {reglas.length === 0 ? (
        <EmptyState
          icon={<IconLayers />}
          title="Esta campaña aún no tiene reglas"
          description="Crea la primera regla para definir cómo se bonificarán los pedidos de esta campaña."
          action={
            <Button
              variant="primary"
              onClick={() => navigate(`${rutaCampana}/reglas/nueva`)}
            >
              <IconPlus width={16} height={16} />
              Crear primera regla
            </Button>
          }
        />
      ) : (
        <div className={styles.list}>
          {reglas.map((regla) => {
            const asignado = regla.stock.reduce((t, s) => t + s.asignado, 0);
            const consumido = regla.stock.reduce((t, s) => t + s.consumido, 0);
            const rutaRegla = `${rutaCampana}/reglas/${encodeURIComponent(regla.codigo ?? "")}`;

            return (
              <article key={regla.codigo} className={styles.row}>
                <div className={styles.main}>
                  <h3 className={styles.name}>{regla.nombre}</h3>
                  <p className={styles.desc}>
                    {regla.codigo} · {regla.tipo}
                  </p>
                  <div className={styles.badgeRow}>
                    <Badge tone="accent">
                      {AGRUPACION_LABEL[regla.agrupacion]} (
                      {regla.agrupacionValores.length})
                    </Badge>
                    {regla.usaEscalonamiento && (
                      <Badge tone="tier">{regla.niveles.length} niveles</Badge>
                    )}
                    {regla.frecuencia === "M" && (
                      <Badge tone="warning">
                        {regla.maximoPorCliente ?? 1}× al mes
                      </Badge>
                    )}
                    {regla.frecuencia === "U" && (
                      <Badge tone="warning">Una vez por cliente</Badge>
                    )}
                    {regla.canales.length > 0 && (
                      <Badge>{regla.canales.length} canal(es)</Badge>
                    )}
                    {regla.regiones.length > 0 && (
                      <Badge>{regla.regiones.length} región(es)</Badge>
                    )}
                    {regla.territorios.length > 0 && (
                      <Badge>{regla.territorios.length} territorio(s)</Badge>
                    )}
                  </div>
                </div>

                <div className={styles.condicion}>
                  <strong>Condición</strong>
                  <br />
                  {describirCondicion(regla)}
                </div>

                <div>
                  {regla.stockLimitado && asignado > 0 ? (
                    <>
                      <div className={styles.stockLabel}>
                        <span>Stock</span>
                        <span className="tabular">
                          {consumido}/{asignado}
                        </span>
                      </div>
                      <ProgressBar
                        value={consumido}
                        max={asignado}
                        tone="tier"
                      />
                    </>
                  ) : (
                    <span className={styles.condicion}>Stock sin límite</span>
                  )}
                </div>

                <div className={styles.actions}>
                  <Badge tone={regla.activa ? "success" : "neutral"} dot>
                    {regla.activa ? "Activa" : "Inactiva"}
                  </Badge>
                  <div className={styles.rowActions}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(rutaRegla)}
                      aria-label="Editar regla"
                    >
                      <IconEdit width={16} height={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAEliminar(regla)}
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
        open={aEliminar !== null}
        title={`¿Eliminar "${aEliminar?.nombre}"?`}
        message="La regla dejará de evaluarse en la app móvil. Si ya bonificó pedidos no se puede eliminar: desactívala en su lugar."
        onCancel={() => setAEliminar(null)}
        onConfirm={eliminar}
      />
    </>
  );
}
