import type { Beneficio, Nivel, TipoAgrupacion } from "../types/bonificados";
import styles from "./ReglaFormPage.module.css";

interface ReglaPreviewProps {
  nombreRegla: string;
  tipoAgrupacion: TipoAgrupacion;
  agrupacionTexto: string;
  canales: string[];
  regiones: string[];
  territorios: string[];
  tiposCliente: string[];
  usaEscalonamiento: boolean;
  cantidadMinima?: number;
  montoMinimo?: number;
  beneficiosSimples: Beneficio[];
  niveles: Nivel[];
  precioMinimoBonificado?: number;
  stockAsignado?: number;
  stockConsumido: number;
  limiteMensualActivo: boolean;
  limiteMensualCantidad?: number;
}

function describeBeneficio(b: Beneficio) {
  if (!b.productoNombre) return null;
  const base = `${b.cantidad}× ${b.productoNombre}`;
  return b.multiOpcion ? `${base} (a elección del vendedor)` : base;
}

export function ReglaPreview(p: ReglaPreviewProps) {
  const alcance = [...p.canales, ...p.regiones, ...p.territorios, ...p.tiposCliente];

  const disponible =
    p.stockAsignado !== undefined ? Math.max(0, p.stockAsignado - p.stockConsumido) : undefined;

  return (
    <aside className={styles.preview}>
      <span className={styles.previewEyebrow}>Así se leerá en la app móvil</span>
      <p className={styles.previewName}>“{p.nombreRegla || "Nueva regla sin nombre"}”</p>

      <p className={styles.previewText}>
        Aplica a clientes {alcance.length > 0 ? <strong>{alcance.join(", ")}</strong> : "de cualquier segmento"} que
        compren por <strong>{p.agrupacionTexto || "definir"}</strong>.
      </p>

      {p.usaEscalonamiento ? (
        <p className={styles.previewText}>
          Bonificación <strong>escalonada</strong> en {p.niveles.length || 0} nivel(es):
          <br />
          {p.niveles.length === 0 && "aún sin niveles configurados."}
          {p.niveles.map((nivel, idx) => {
            const beneficio = describeBeneficio(nivel.beneficios[0]);
            return (
              <span key={nivel.id ?? idx}>
                Nivel {idx + 1}: desde <strong>{nivel.cantidadMinima ?? "—"}</strong> uds → {beneficio ?? "sin beneficio definido"}
                <br />
              </span>
            );
          })}
        </p>
      ) : (
        <p className={styles.previewText}>
          Con una compra mínima de{" "}
          <strong>
            {p.cantidadMinima ? `${p.cantidadMinima} uds` : p.montoMinimo ? `$${p.montoMinimo.toLocaleString()}` : "— sin definir"}
          </strong>
          , el vendedor recibe:
          <br />
          {p.beneficiosSimples.length === 0 && "aún sin beneficios configurados."}
          {p.beneficiosSimples.map((b, idx) => (
            <span key={b.id ?? idx}>
              {describeBeneficio(b) ?? "sin beneficio definido"}
              <br />
            </span>
          ))}
        </p>
      )}

      <div className={styles.previewDivider} />

      {p.precioMinimoBonificado !== undefined && (
        <div className={styles.previewStat}>
          <span>Precio mínimo del bonificado</span>
          <span>${p.precioMinimoBonificado.toLocaleString()}</span>
        </div>
      )}
      {p.stockAsignado !== undefined && (
        <div className={styles.previewStat}>
          <span>Stock disponible</span>
          <span>
            {disponible}/{p.stockAsignado}
          </span>
        </div>
      )}
      <div className={styles.previewStat}>
        <span>Límite por cliente</span>
        <span>{p.limiteMensualActivo ? `${p.limiteMensualCantidad ?? 1}× al mes` : "Sin límite"}</span>
      </div>
    </aside>
  );
}
