import type { Catalogos } from "../types/bonificados";
import type { BeneficioForm, ReglaForm } from "./ReglaFormPage";
import styles from "./ReglaFormPage.module.css";

interface ReglaPreviewProps {
  form: ReglaForm;
  catalogos: Catalogos;
  productos: Map<string, string>;
}

const numero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

function nombres(
  codigos: string[],
  catalogo: { codigo: string; nombre: string }[],
) {
  const mapa = new Map(catalogo.map((c) => [c.codigo, c.nombre]));
  return codigos.map((c) => mapa.get(c) ?? c);
}

/** Resumen en lenguaje natural de lo que verá el vendedor. */
export function ReglaPreview({
  form,
  catalogos,
  productos,
}: ReglaPreviewProps) {
  const producto = (id: string) => productos.get(id) ?? (id || "—");
  const medida = (valor: string) =>
    form.medida === "MONTO"
      ? `$${numero.format(Number(valor) || 0)}`
      : `${numero.format(Number(valor) || 0)} uds`;

  const alcance = [
    ...nombres(form.canales, catalogos.canales),
    ...nombres(form.regiones, catalogos.regiones),
    ...nombres(form.territorios, catalogos.territorios),
  ];

  const agrupacion = (() => {
    const v = form.agrupacionValores;
    switch (form.agrupacion) {
      case "PRODUCTO":
        return v.length > 3
          ? `${v.length} productos`
          : v.map(producto).join(", ");
      case "LINEA":
        return nombres(v, catalogos.lineas).join(", ");
      case "SUBLINEA":
        return nombres(
          v.map((x) => x.split("|")[1] ?? x),
          catalogos.sublineas,
        ).join(", ");
      case "GRUPO_MIXTO":
        return nombres(v, catalogos.grupos).join(", ");
    }
  })();

  function beneficio(b: BeneficioForm) {
    const cantidad = numero.format(Number(b.cantidad) || 0);
    switch (b.tipo) {
      case "SPECIFIC_PRODUCT":
        return `${cantidad}× ${producto(b.productoId)}`;
      case "SAME_PRODUCT":
        return `${cantidad}× del mismo producto comprado`;
      case "LOWEST_VALUE":
        return `${cantidad}× el de menor valor de ${nombres([b.grupo], catalogos.grupos)[0] || "—"}`;
      case "MULTIPLE_OPTION":
        return `${cantidad}× a elegir entre ${b.opciones.length} productos`;
    }
  }

  const minimo = [
    form.cantidadMinima
      ? `${numero.format(Number(form.cantidadMinima))} uds`
      : "",
    form.montoMinimo ? `$${numero.format(Number(form.montoMinimo))}` : "",
  ]
    .filter(Boolean)
    .join(" y ");

  const totalCupo = form.stock.reduce(
    (t, s) => t + (Number(s.asignado) || 0),
    0,
  );
  const totalConsumido = form.stock.reduce((t, s) => t + s.consumido, 0);

  return (
    <aside className={styles.preview}>
      <span className={styles.previewEyebrow}>
        Así se leerá en la app móvil
      </span>
      <p className={styles.previewName}>
        “{form.nombre || "Nueva regla sin nombre"}”
      </p>

      <p className={styles.previewText}>
        Aplica a clientes{" "}
        {alcance.length > 0 ? (
          <strong>{alcance.join(", ")}</strong>
        ) : (
          "de cualquier segmento"
        )}{" "}
        que compren <strong>{agrupacion || "(sin productos elegidos)"}</strong>.
      </p>

      {form.usaEscalonamiento ? (
        <p className={styles.previewText}>
          Bonificación <strong>escalonada</strong> en {form.niveles.length}{" "}
          nivel(es):
          <br />
          {form.niveles.length === 0 && "aún sin niveles."}
          {form.niveles.map((nivel, idx) => (
            <span key={nivel.clave}>
              Nivel {idx + 1}: desde{" "}
              <strong>{nivel.desde ? medida(nivel.desde) : "—"}</strong> →{" "}
              {nivel.beneficios.length === 0
                ? "sin bonificados"
                : nivel.beneficios
                    .map((b) =>
                      b.igualAlTotal
                        ? `${producto(b.productoId)} (igual al total)`
                        : `${numero.format(Number(b.cantidad) || 0)}× ${producto(b.productoId)}`,
                    )
                    .join(" + ")}
              <br />
            </span>
          ))}
        </p>
      ) : (
        <p className={styles.previewText}>
          Con una compra mínima de <strong>{minimo || "— sin definir"}</strong>,
          el cliente recibe
          {form.multiplo && form.cantidadMinima ? (
            <>
              {" "}
              (y otra vez por cada <strong>{form.multiplo}</strong> unidades
              adicionales)
            </>
          ) : null}
          :
          <br />
          {form.beneficios.length === 0 && "aún sin beneficios."}
          {form.beneficios.map((b) => (
            <span key={b.clave}>
              {beneficio(b)}
              <br />
            </span>
          ))}
        </p>
      )}

      <div className={styles.previewDivider} />

      {form.precioMinimo ? (
        <div className={styles.previewStat}>
          <span>Precio mínimo del bonificado</span>
          <span>${numero.format(Number(form.precioMinimo))}</span>
        </div>
      ) : null}
      {form.stockLimitado ? (
        <div className={styles.previewStat}>
          <span>Stock disponible</span>
          <span>
            {Math.max(0, totalCupo - totalConsumido)}/{totalCupo}
          </span>
        </div>
      ) : null}
      <div className={styles.previewStat}>
        <span>Límite por cliente</span>
        <span>
          {form.frecuencia === "N"
            ? "Sin límite"
            : form.frecuencia === "M"
              ? `${form.maximoPorCliente || 1}× al mes`
              : `${form.maximoPorCliente || 1}× en total`}
        </span>
      </div>
      {!form.activa ? (
        <div className={styles.previewStat}>
          <span>Estado</span>
          <span>Inactiva</span>
        </div>
      ) : null}
    </aside>
  );
}
