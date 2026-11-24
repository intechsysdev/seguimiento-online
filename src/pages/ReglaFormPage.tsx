import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { MultiSelect, type OpcionMulti } from "../components/ui/MultiSelect";
import { Spinner } from "../components/ui/Spinner";
import { Switch } from "../components/ui/Switch";
import inputStyles from "../components/ui/inputs.module.css";
import { IconPlus, IconTrash } from "../components/icons";
import { useApi } from "../hooks/useApi";
import { bonificadosService } from "../services/eva/bonificadosService";
import { useAuth } from "../store/AuthContext";
import {
  soloFecha,
  type Campana,
  type Catalogos,
  type Frecuencia,
  type Medida,
  type Regla,
  type TipoAgrupacion,
  type TipoBeneficio,
} from "../types/bonificados";
import { ReglaPreview } from "./ReglaPreview";
import styles from "./ReglaFormPage.module.css";

// ---------------------------------------------------------------------------
// Estado del formulario. Los números van como texto para permitir campos
// vacíos; se convierten al guardar. `clave` solo sirve de key en React.
// ---------------------------------------------------------------------------

let contador = 0;
const nuevaClave = () => `k${++contador}`;

export interface BeneficioForm {
  clave: string;
  tipo: TipoBeneficio;
  cantidad: string;
  productoId: string;
  grupo: string;
  opciones: string[];
}

export interface NivelBeneficioForm {
  clave: string;
  productoId: string;
  cantidad: string;
  igualAlTotal: boolean;
}

export interface NivelForm {
  clave: string;
  desde: string;
  beneficios: NivelBeneficioForm[];
}

export interface StockForm {
  clave: string;
  productoId: string;
  asignado: string;
  consumido: number;
}

export interface ReglaForm {
  nombre: string;
  activa: boolean;
  prioridad: string;
  acumulable: boolean;
  fechaInicio: string;
  fechaFin: string;
  canales: string[];
  regiones: string[];
  territorios: string[];
  agrupacion: TipoAgrupacion;
  agrupacionValores: string[];
  usaEscalonamiento: boolean;
  medida: Medida;
  cantidadMinima: string;
  montoMinimo: string;
  multiplo: string;
  beneficios: BeneficioForm[];
  niveles: NivelForm[];
  precioMinimo: string;
  frecuencia: Frecuencia;
  maximoPorCliente: string;
  stockLimitado: boolean;
  stock: StockForm[];
}

const texto = (valor?: number | null) =>
  valor === undefined || valor === null ? "" : String(valor);
const num = (valor: string) => (valor.trim() === "" ? null : Number(valor));

function beneficioVacio(): BeneficioForm {
  return {
    clave: nuevaClave(),
    tipo: "SPECIFIC_PRODUCT",
    cantidad: "1",
    productoId: "",
    grupo: "",
    opciones: [],
  };
}

function nivelBeneficioVacio(): NivelBeneficioForm {
  return {
    clave: nuevaClave(),
    productoId: "",
    cantidad: "1",
    igualAlTotal: false,
  };
}

function desdeRegla(r?: Regla): ReglaForm {
  return {
    nombre: r?.nombre ?? "",
    activa: r?.activa ?? true,
    prioridad: String(r?.prioridad ?? 1),
    acumulable: r?.acumulable ?? false,
    fechaInicio: soloFecha(r?.fechaInicio),
    fechaFin: soloFecha(r?.fechaFin),
    canales: r?.canales ?? [],
    regiones: r?.regiones ?? [],
    territorios: r?.territorios ?? [],
    agrupacion: r?.agrupacion ?? "PRODUCTO",
    agrupacionValores: r?.agrupacionValores ?? [],
    usaEscalonamiento: r?.usaEscalonamiento ?? false,
    medida: r?.medida ?? "UNIDADES",
    cantidadMinima: texto(r?.cantidadMinima),
    montoMinimo: texto(r?.montoMinimo),
    multiplo: texto(r?.multiplo),
    beneficios: r?.beneficios.length
      ? r.beneficios.map((b) => ({
          clave: nuevaClave(),
          tipo: b.tipo,
          cantidad: String(b.cantidad),
          productoId: b.productoId ?? "",
          grupo: b.grupo ?? "",
          opciones: b.opciones.map((o) => o.productoId),
        }))
      : [beneficioVacio()],
    niveles: (r?.niveles ?? []).map((n) => ({
      clave: nuevaClave(),
      desde: String(n.desde),
      beneficios: n.beneficios.map((b) => ({
        clave: nuevaClave(),
        productoId: b.productoId,
        cantidad: String(b.cantidad),
        igualAlTotal: Boolean(b.igualAlTotal),
      })),
    })),
    precioMinimo: texto(r?.precioMinimoBonificado),
    frecuencia: r?.frecuencia ?? "N",
    maximoPorCliente: texto(r?.maximoPorCliente ?? 1),
    stockLimitado: r?.stockLimitado ?? false,
    stock: (r?.stock ?? []).map((s) => ({
      clave: nuevaClave(),
      productoId: s.productoId,
      asignado: String(s.asignado),
      consumido: s.consumido,
    })),
  };
}

function aRegla(
  f: ReglaForm,
  base: { cmpy: string; campana: string; codigo?: string; usuario: string },
): Regla {
  return {
    ...base,
    nombre: f.nombre.trim(),
    activa: f.activa,
    prioridad: Number(f.prioridad) || 1,
    acumulable: f.acumulable,
    fechaInicio: f.fechaInicio || null,
    fechaFin: f.fechaFin || null,
    canales: f.canales,
    regiones: f.regiones,
    territorios: f.territorios,
    agrupacion: f.agrupacion,
    agrupacionValores: f.agrupacionValores,
    usaEscalonamiento: f.usaEscalonamiento,
    medida: f.medida,
    cantidadMinima: f.usaEscalonamiento ? null : num(f.cantidadMinima),
    montoMinimo: f.usaEscalonamiento ? null : num(f.montoMinimo),
    multiplo:
      f.usaEscalonamiento || !f.cantidadMinima.trim() ? null : num(f.multiplo),
    beneficios: f.usaEscalonamiento
      ? []
      : f.beneficios.map((b) => ({
          tipo: b.tipo,
          cantidad: Number(b.cantidad) || 0,
          productoId:
            b.tipo === "SPECIFIC_PRODUCT" ? b.productoId || null : null,
          grupo: b.tipo === "LOWEST_VALUE" ? b.grupo || null : null,
          opciones:
            b.tipo === "MULTIPLE_OPTION"
              ? b.opciones.map((id) => ({
                  productoId: id,
                  cantidad: Number(b.cantidad) || 0,
                }))
              : [],
        })),
    niveles: f.usaEscalonamiento
      ? f.niveles.map((n, i) => ({
          nivel: i + 1,
          desde: Number(n.desde) || 0,
          beneficios: n.beneficios.map((b) => ({
            productoId: b.productoId,
            cantidad: b.igualAlTotal ? 0 : Number(b.cantidad) || 0,
            igualAlTotal: b.igualAlTotal,
          })),
        }))
      : [],
    precioMinimoBonificado: num(f.precioMinimo),
    frecuencia: f.frecuencia,
    maximoPorCliente:
      f.frecuencia === "N" ? null : Number(f.maximoPorCliente) || 1,
    stockLimitado: f.stockLimitado,
    stock: f.stockLimitado
      ? f.stock.map((s) => ({
          productoId: s.productoId,
          asignado: Number(s.asignado) || 0,
          consumido: s.consumido,
        }))
      : [],
  };
}

const AGRUPACIONES: { value: TipoAgrupacion; label: string }[] = [
  { value: "PRODUCTO", label: "Productos" },
  { value: "LINEA", label: "Líneas" },
  { value: "SUBLINEA", label: "Sublíneas" },
  { value: "GRUPO_MIXTO", label: "Grupo mixto" },
];

const TIPOS_BENEFICIO: { value: TipoBeneficio; label: string }[] = [
  { value: "SPECIFIC_PRODUCT", label: "Producto específico" },
  { value: "SAME_PRODUCT", label: "El mismo producto comprado" },
  { value: "LOWEST_VALUE", label: "El de menor valor de un grupo" },
  { value: "MULTIPLE_OPTION", label: "A elección del vendedor" },
];

const LISTA_PRODUCTOS = "bonificados-productos";

// ---------------------------------------------------------------------------
// Página: carga campaña, catálogos y (al editar) la regla; luego monta el form.
// ---------------------------------------------------------------------------

export function ReglaFormPage() {
  const { campanaId, reglaId } = useParams();
  const { session, tenant } = useAuth();
  const cmpy = session?.tenantActual ?? "";
  const campana = campanaId ?? "";

  const datos = useApi(async () => {
    if (!tenant || !cmpy) return undefined;
    const [c, catalogos, regla] = await Promise.all([
      bonificadosService.campana(tenant, cmpy, campana),
      bonificadosService.catalogos(tenant, cmpy),
      reglaId
        ? bonificadosService.regla(tenant, cmpy, reglaId)
        : Promise.resolve(undefined),
    ]);
    return { campana: c, catalogos, regla };
  }, [tenant?.IDTenant, cmpy, campana, reglaId]);

  if (datos.cargando && !datos.datos)
    return <Spinner mensaje="Cargando catálogos…" />;
  if (datos.error || !datos.datos) {
    return (
      <Alert tone="critical">
        No se pudo cargar la regla: {datos.error ?? "sin compañía activa"}
      </Alert>
    );
  }

  return (
    <FormularioRegla
      key={reglaId ?? "nueva"}
      campana={datos.datos.campana}
      catalogos={datos.datos.catalogos}
      regla={datos.datos.regla}
    />
  );
}

function FormularioRegla({
  campana,
  catalogos,
  regla,
}: {
  campana: Campana;
  catalogos: Catalogos;
  regla?: Regla;
}) {
  const navigate = useNavigate();
  const { session, tenant } = useAuth();
  const isEdit = Boolean(regla);
  const rutaCampana = `/bonificados/campanas/${encodeURIComponent(campana.codigo)}`;

  const [form, setForm] = useState<ReglaForm>(() => desdeRegla(regla));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const productos = useMemo(
    () => new Map(catalogos.productos.map((p) => [p.codigo, p.nombre])),
    [catalogos],
  );

  const opciones = useMemo(() => {
    const comoOpcion = (c: {
      codigo: string;
      nombre: string;
    }): OpcionMulti => ({
      valor: c.codigo,
      etiqueta: c.nombre === c.codigo ? c.codigo : `${c.nombre} (${c.codigo})`,
    });
    const lineas = new Map(catalogos.lineas.map((l) => [l.codigo, l.nombre]));
    return {
      canales: catalogos.canales.map(comoOpcion),
      regiones: catalogos.regiones.map(comoOpcion),
      territorios: catalogos.territorios.map(comoOpcion),
      lineas: catalogos.lineas.map(comoOpcion),
      sublineas: catalogos.sublineas.map((s) => ({
        valor: `${s.linea}|${s.codigo}`,
        etiqueta: `${lineas.get(s.linea) ?? s.linea} › ${s.nombre}`,
      })),
      productos: catalogos.productos.map((p) => ({
        valor: p.codigo,
        etiqueta: `[${p.codigo}] ${p.nombre}`,
      })),
    };
  }, [catalogos]);

  function set<K extends keyof ReglaForm>(clave: K, valor: ReglaForm[K]) {
    setForm((f) => ({ ...f, [clave]: valor }));
  }

  // ---- beneficios simples ----
  function cambiarBeneficio(clave: string, cambio: Partial<BeneficioForm>) {
    set(
      "beneficios",
      form.beneficios.map((b) => (b.clave === clave ? { ...b, ...cambio } : b)),
    );
  }

  // ---- niveles ----
  function agregarNivel() {
    const ultimo = form.niveles[form.niveles.length - 1];
    set("niveles", [
      ...form.niveles,
      {
        clave: nuevaClave(),
        desde: "",
        // El nivel nuevo arranca con los mismos productos del anterior: suele variar solo la cantidad.
        beneficios: ultimo
          ? ultimo.beneficios.map((b) => ({ ...b, clave: nuevaClave() }))
          : [nivelBeneficioVacio()],
      },
    ]);
  }

  function cambiarNivel(clave: string, cambio: Partial<NivelForm>) {
    set(
      "niveles",
      form.niveles.map((n) => (n.clave === clave ? { ...n, ...cambio } : n)),
    );
  }

  function cambiarBeneficioNivel(
    nivel: NivelForm,
    clave: string,
    cambio: Partial<NivelBeneficioForm>,
  ) {
    cambiarNivel(nivel.clave, {
      beneficios: nivel.beneficios.map((b) =>
        b.clave === clave ? { ...b, ...cambio } : b,
      ),
    });
  }

  // ---- stock ----
  function cambiarStock(clave: string, cambio: Partial<StockForm>) {
    set(
      "stock",
      form.stock.map((s) => (s.clave === clave ? { ...s, ...cambio } : s)),
    );
  }

  /** Productos fijos que la regla bonifica: sugerencia para el cupo de stock. */
  function productosBonificados() {
    const ids = form.usaEscalonamiento
      ? form.niveles.flatMap((n) => n.beneficios.map((b) => b.productoId))
      : form.beneficios.flatMap((b) =>
          b.tipo === "MULTIPLE_OPTION" ? b.opciones : [b.productoId],
        );
    return [...new Set(ids.filter(Boolean))];
  }

  function cargarStockSugerido() {
    const presentes = new Set(form.stock.map((s) => s.productoId));
    const nuevos = productosBonificados()
      .filter((id) => !presentes.has(id))
      .map((id) => ({
        clave: nuevaClave(),
        productoId: id,
        asignado: "",
        consumido: 0,
      }));
    set("stock", [...form.stock.filter((s) => s.productoId), ...nuevos]);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    if (!form.nombre.trim()) {
      setError("El nombre de la regla es obligatorio.");
      return;
    }
    if (form.agrupacionValores.length === 0) {
      setError("Elige al menos un elemento en la agrupación de productos.");
      return;
    }
    setError("");
    setGuardando(true);

    const datos = aRegla(form, {
      cmpy: campana.cmpy,
      campana: campana.codigo,
      codigo: regla?.codigo,
      usuario: session?.username ?? "",
    });

    try {
      if (isEdit) await bonificadosService.actualizarRegla(tenant, datos);
      else await bonificadosService.crearRegla(tenant, datos);
      navigate(rutaCampana);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la regla.",
      );
      setGuardando(false);
    }
  }

  const unidadNivel =
    form.medida === "MONTO" ? "Monto desde" : "Unidades desde";

  return (
    <>
      <PageHeader
        eyebrow={`${campana.nombre} · ${campana.codigo}`}
        title={
          isEdit
            ? `Editar regla ${regla?.codigo}`
            : "Nueva regla de bonificación"
        }
        backTo={rutaCampana}
        backLabel="Reglas"
      />

      {/* Una sola lista para todos los buscadores de producto del formulario. */}
      <datalist id={LISTA_PRODUCTOS}>
        {catalogos.productos.map((p) => (
          <option key={p.codigo} value={p.codigo}>
            {p.nombre}
          </option>
        ))}
      </datalist>

      <form onSubmit={guardar} className={styles.layout}>
        <div className={styles.form}>
          {/* 1. General */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>
                <span className={styles.sectionNum}>1</span>Información general
              </span>
              {regla?.tipo ? (
                <span className={styles.sectionHint}>Tipo {regla.tipo}</span>
              ) : null}
            </div>
            <Field label="Nombre de la regla" htmlFor="nombreRegla">
              <input
                id="nombreRegla"
                className={inputStyles.input}
                value={form.nombre}
                maxLength={150}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder="Ej: Escalonamiento Tintes 5 niveles"
              />
            </Field>
            <div className={styles.row3}>
              <Field
                label="Prioridad"
                htmlFor="prioridad"
                hint="1 se evalúa primero."
              >
                <input
                  id="prioridad"
                  type="number"
                  min={1}
                  max={999}
                  className={inputStyles.input}
                  value={form.prioridad}
                  onChange={(e) => set("prioridad", e.target.value)}
                />
              </Field>
              <Field
                label="Vigencia propia desde"
                optional
                htmlFor="fechaInicio"
              >
                <input
                  id="fechaInicio"
                  type="date"
                  className={inputStyles.input}
                  value={form.fechaInicio}
                  onChange={(e) => set("fechaInicio", e.target.value)}
                />
              </Field>
              <Field
                label="Hasta"
                optional
                htmlFor="fechaFin"
                hint="Vacío = la de la campaña."
              >
                <input
                  id="fechaFin"
                  type="date"
                  className={inputStyles.input}
                  value={form.fechaFin}
                  onChange={(e) => set("fechaFin", e.target.value)}
                />
              </Field>
            </div>
            <div className={styles.switchCard}>
              <Switch
                checked={form.activa}
                onChange={(v) => set("activa", v)}
                label="Regla activa"
              />
              <Switch
                checked={form.acumulable}
                onChange={(v) => set("acumulable", v)}
                label="Acumulable"
                hint="Puede aplicarse junto con otras reglas en el mismo pedido."
              />
            </div>
          </section>

          {/* 2. Alcance */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>
                <span className={styles.sectionNum}>2</span>Alcance
              </span>
              <span className={styles.sectionHint}>
                Sin selección = aplica a todos
              </span>
            </div>
            <div className={styles.scopeGrid}>
              <MultiSelect
                etiqueta="Canales"
                opciones={opciones.canales}
                seleccion={form.canales}
                onChange={(v) => set("canales", v)}
              />
              <MultiSelect
                etiqueta="Regiones"
                opciones={opciones.regiones}
                seleccion={form.regiones}
                onChange={(v) => set("regiones", v)}
              />
              <MultiSelect
                etiqueta="Territorios"
                opciones={opciones.territorios}
                seleccion={form.territorios}
                onChange={(v) => set("territorios", v)}
              />
            </div>
          </section>

          {/* 3. Agrupación */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>
                <span className={styles.sectionNum}>3</span>Productos que
                cuentan
              </span>
              <span className={styles.sectionHint}>
                Las cantidades se suman entre todos
              </span>
            </div>
            <div className={styles.segmented}>
              {AGRUPACIONES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={[
                    styles.segmentBtn,
                    form.agrupacion === opt.value ? styles.segmentActive : "",
                  ].join(" ")}
                  aria-pressed={form.agrupacion === opt.value}
                  onClick={() =>
                    form.agrupacion !== opt.value &&
                    setForm((f) => ({
                      ...f,
                      agrupacion: opt.value,
                      agrupacionValores: [],
                    }))
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {form.agrupacion === "PRODUCTO" && (
              <MultiSelect
                etiqueta="Productos"
                opciones={opciones.productos}
                seleccion={form.agrupacionValores}
                onChange={(v) => set("agrupacionValores", v)}
                vacioSignifica="Ninguno"
              />
            )}
            {form.agrupacion === "LINEA" && (
              <MultiSelect
                etiqueta="Líneas"
                opciones={opciones.lineas}
                seleccion={form.agrupacionValores}
                onChange={(v) => set("agrupacionValores", v)}
                vacioSignifica="Ninguna"
              />
            )}
            {form.agrupacion === "SUBLINEA" && (
              <MultiSelect
                etiqueta="Sublíneas"
                opciones={opciones.sublineas}
                seleccion={form.agrupacionValores}
                onChange={(v) => set("agrupacionValores", v)}
                vacioSignifica="Ninguna"
              />
            )}
            {form.agrupacion === "GRUPO_MIXTO" &&
              (catalogos.grupos.length === 0 ? (
                <Alert tone="warning">
                  No hay grupos mixtos creados para esta compañía (tabla
                  mob_rbongrupo).
                </Alert>
              ) : (
                <Field label="Grupo mixto" htmlFor="grupo">
                  <select
                    id="grupo"
                    className={inputStyles.select}
                    value={form.agrupacionValores[0] ?? ""}
                    onChange={(e) =>
                      set(
                        "agrupacionValores",
                        e.target.value ? [e.target.value] : [],
                      )
                    }
                  >
                    <option value="">Seleccionar grupo…</option>
                    {catalogos.grupos.map((g) => (
                      <option key={g.codigo} value={g.codigo}>
                        {g.nombre} ({g.elementos} elementos)
                        {g.activo ? "" : " · inactivo"}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
          </section>

          {/* 4. Condición y beneficios */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>
                <span className={styles.sectionNum}>4</span>Condición y
                beneficios
              </span>
            </div>
            <div className={styles.switchCard}>
              <Switch
                checked={form.usaEscalonamiento}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    usaEscalonamiento: v,
                    niveles:
                      v && f.niveles.length === 0
                        ? [
                            {
                              clave: nuevaClave(),
                              desde: "",
                              beneficios: [nivelBeneficioVacio()],
                            },
                          ]
                        : f.niveles,
                  }))
                }
                label="Escalonamiento por niveles"
                hint="A mayor volumen comprado, mayor bonificación."
              />
            </div>

            {!form.usaEscalonamiento && (
              <>
                <div className={styles.row3}>
                  <Field
                    label="Cantidad mínima"
                    optional
                    htmlFor="cantidadMinima"
                  >
                    <input
                      id="cantidadMinima"
                      type="number"
                      min={0}
                      step="any"
                      className={inputStyles.input}
                      value={form.cantidadMinima}
                      onChange={(e) => set("cantidadMinima", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Monto mínimo (IVA incluido)"
                    optional
                    htmlFor="montoMinimo"
                  >
                    <div className={inputStyles.prefixWrap}>
                      <span className={inputStyles.prefix}>$</span>
                      <input
                        id="montoMinimo"
                        type="number"
                        min={0}
                        step="any"
                        className={inputStyles.input}
                        value={form.montoMinimo}
                        onChange={(e) => set("montoMinimo", e.target.value)}
                      />
                    </div>
                  </Field>
                  <Field
                    label="Repetir por cada"
                    optional
                    htmlFor="multiplo"
                    hint="Unidades adicionales que vuelven a dar el beneficio (3+1: mínimo 3, cada 3)."
                  >
                    <input
                      id="multiplo"
                      type="number"
                      min={0}
                      step="any"
                      className={inputStyles.input}
                      value={form.multiplo}
                      disabled={!form.cantidadMinima}
                      onChange={(e) => set("multiplo", e.target.value)}
                    />
                  </Field>
                </div>

                <span className={styles.miniLabel}>Beneficios</span>
                <div className={styles.benefList}>
                  {form.beneficios.map((b) => (
                    <div key={b.clave} className={styles.benefRow}>
                      <Field label="Qué se bonifica">
                        <select
                          className={inputStyles.select}
                          value={b.tipo}
                          onChange={(e) =>
                            cambiarBeneficio(b.clave, {
                              tipo: e.target.value as TipoBeneficio,
                            })
                          }
                        >
                          {TIPOS_BENEFICIO.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      {b.tipo === "SPECIFIC_PRODUCT" ? (
                        <Field label="Producto">
                          <ProductoPicker
                            valor={b.productoId}
                            productos={productos}
                            onChange={(id) =>
                              cambiarBeneficio(b.clave, { productoId: id })
                            }
                          />
                        </Field>
                      ) : b.tipo === "LOWEST_VALUE" ? (
                        <Field label="Grupo">
                          <select
                            className={inputStyles.select}
                            value={b.grupo}
                            onChange={(e) =>
                              cambiarBeneficio(b.clave, {
                                grupo: e.target.value,
                              })
                            }
                          >
                            <option value="">Seleccionar…</option>
                            {catalogos.grupos.map((g) => (
                              <option key={g.codigo} value={g.codigo}>
                                {g.nombre}
                              </option>
                            ))}
                          </select>
                        </Field>
                      ) : (
                        <span className={styles.sectionHint}>
                          {b.tipo === "SAME_PRODUCT"
                            ? "Del mismo producto que se compró."
                            : "Opciones abajo."}
                        </span>
                      )}

                      <Field label="Cantidad">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className={inputStyles.input}
                          value={b.cantidad}
                          onChange={(e) =>
                            cambiarBeneficio(b.clave, {
                              cantidad: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <span />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          set(
                            "beneficios",
                            form.beneficios.filter((x) => x.clave !== b.clave),
                          )
                        }
                        aria-label="Quitar beneficio"
                      >
                        <IconTrash width={16} height={16} />
                      </Button>

                      {b.tipo === "MULTIPLE_OPTION" && (
                        <div className={styles.benefOpciones}>
                          <MultiSelect
                            etiqueta="Opciones entre las que elige el vendedor"
                            opciones={opciones.productos}
                            seleccion={b.opciones}
                            onChange={(v) =>
                              cambiarBeneficio(b.clave, { opciones: v })
                            }
                            vacioSignifica="Ninguna"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={styles.addRowBtn}
                  onClick={() =>
                    set("beneficios", [...form.beneficios, beneficioVacio()])
                  }
                >
                  <IconPlus width={14} height={14} />
                  Agregar beneficio
                </Button>
              </>
            )}

            {form.usaEscalonamiento && (
              <>
                <Field label="Los niveles se miden por" htmlFor="medida">
                  <select
                    id="medida"
                    className={inputStyles.select}
                    value={form.medida}
                    onChange={(e) => set("medida", e.target.value as Medida)}
                  >
                    <option value="UNIDADES">Unidades compradas</option>
                    <option value="MONTO">Monto comprado (IVA incluido)</option>
                  </select>
                </Field>

                <div className={styles.escalera}>
                  {form.niveles.map((nivel, idx) => (
                    <div key={nivel.clave} className={styles.nivelCard}>
                      <span className={styles.nivelNode}>{idx + 1}</span>
                      <div className={styles.nivelHead}>
                        <span className={styles.nivelTitle}>
                          Nivel {idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            set(
                              "niveles",
                              form.niveles.filter(
                                (n) => n.clave !== nivel.clave,
                              ),
                            )
                          }
                          aria-label={`Quitar nivel ${idx + 1}`}
                        >
                          <IconTrash width={16} height={16} />
                        </Button>
                      </div>
                      <Field
                        label={unidadNivel}
                        hint="Va hasta donde empieza el nivel siguiente."
                      >
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className={inputStyles.input}
                          value={nivel.desde}
                          onChange={(e) =>
                            cambiarNivel(nivel.clave, { desde: e.target.value })
                          }
                        />
                      </Field>

                      <span className={styles.miniLabel}>
                        Bonificados de este nivel
                      </span>
                      {nivel.beneficios.map((b) => (
                        <div key={b.clave} className={styles.nivelBenefRow}>
                          <Field label="Producto">
                            <ProductoPicker
                              valor={b.productoId}
                              productos={productos}
                              onChange={(id) =>
                                cambiarBeneficioNivel(nivel, b.clave, {
                                  productoId: id,
                                })
                              }
                            />
                          </Field>
                          <Field label="Cantidad">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              className={inputStyles.input}
                              value={b.igualAlTotal ? "" : b.cantidad}
                              disabled={b.igualAlTotal}
                              onChange={(e) =>
                                cambiarBeneficioNivel(nivel, b.clave, {
                                  cantidad: e.target.value,
                                })
                              }
                            />
                          </Field>
                          <label className={styles.checkInline}>
                            <input
                              type="checkbox"
                              checked={b.igualAlTotal}
                              onChange={(e) =>
                                cambiarBeneficioNivel(nivel, b.clave, {
                                  igualAlTotal: e.target.checked,
                                })
                              }
                            />
                            Igual al total comprado
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              cambiarNivel(nivel.clave, {
                                beneficios: nivel.beneficios.filter(
                                  (x) => x.clave !== b.clave,
                                ),
                              })
                            }
                            aria-label="Quitar producto del nivel"
                          >
                            <IconTrash width={16} height={16} />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={styles.addRowBtn}
                        onClick={() =>
                          cambiarNivel(nivel.clave, {
                            beneficios: [
                              ...nivel.beneficios,
                              nivelBeneficioVacio(),
                            ],
                          })
                        }
                      >
                        <IconPlus width={14} height={14} />
                        Agregar producto al nivel
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={styles.addRowBtn}
                  onClick={agregarNivel}
                >
                  <IconPlus width={14} height={14} />
                  Agregar nivel
                </Button>
              </>
            )}
          </section>

          {/* 5. Restricciones */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>
                <span className={styles.sectionNum}>5</span>Restricciones
              </span>
            </div>
            <div className={styles.row3}>
              <Field
                label="Precio mínimo del bonificado"
                optional
                htmlFor="precioMinimo"
              >
                <div className={inputStyles.prefixWrap}>
                  <span className={inputStyles.prefix}>$</span>
                  <input
                    id="precioMinimo"
                    type="number"
                    min={0}
                    step="any"
                    className={inputStyles.input}
                    value={form.precioMinimo}
                    onChange={(e) => set("precioMinimo", e.target.value)}
                  />
                </div>
              </Field>
              <Field label="Límite por cliente" htmlFor="frecuencia">
                <select
                  id="frecuencia"
                  className={inputStyles.select}
                  value={form.frecuencia}
                  onChange={(e) =>
                    set("frecuencia", e.target.value as Frecuencia)
                  }
                >
                  <option value="N">Sin límite</option>
                  <option value="M">Por mes</option>
                  <option value="U">Una sola vez</option>
                </select>
              </Field>
              {form.frecuencia !== "N" ? (
                <Field
                  label={
                    form.frecuencia === "M" ? "Veces al mes" : "Veces en total"
                  }
                  htmlFor="maximo"
                >
                  <input
                    id="maximo"
                    type="number"
                    min={1}
                    className={inputStyles.input}
                    value={form.maximoPorCliente}
                    onChange={(e) => set("maximoPorCliente", e.target.value)}
                  />
                </Field>
              ) : (
                <span />
              )}
            </div>

            <div className={styles.switchCard}>
              <Switch
                checked={form.stockLimitado}
                onChange={(v) => {
                  set("stockLimitado", v);
                  if (v && form.stock.length === 0) cargarStockSugerido();
                }}
                label="Stock limitado"
                hint="La regla se apaga sola al agotar el cupo."
              />
            </div>

            {form.stockLimitado && (
              <>
                <div className={styles.benefList}>
                  {form.stock.map((s) => (
                    <div key={s.clave} className={styles.stockRow}>
                      <Field label="Producto">
                        <ProductoPicker
                          valor={s.productoId}
                          productos={productos}
                          onChange={(id) =>
                            cambiarStock(s.clave, { productoId: id })
                          }
                        />
                      </Field>
                      <Field label="Cupo asignado">
                        <input
                          type="number"
                          min={0}
                          className={inputStyles.input}
                          value={s.asignado}
                          onChange={(e) =>
                            cambiarStock(s.clave, { asignado: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Consumido">
                        <span className={styles.lectura}>{s.consumido}</span>
                      </Field>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          set(
                            "stock",
                            form.stock.filter((x) => x.clave !== s.clave),
                          )
                        }
                        aria-label="Quitar cupo"
                      >
                        <IconTrash width={16} height={16} />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className={styles.accionesStock}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      set("stock", [
                        ...form.stock,
                        {
                          clave: nuevaClave(),
                          productoId: "",
                          asignado: "",
                          consumido: 0,
                        },
                      ])
                    }
                  >
                    <IconPlus width={14} height={14} />
                    Agregar producto
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cargarStockSugerido}
                  >
                    Traer los productos bonificados
                  </Button>
                </div>
              </>
            )}
          </section>

          {error ? <Alert tone="critical">{error}</Alert> : null}

          <div className={styles.formActions}>
            <Button type="submit" variant="primary" disabled={guardando}>
              {guardando
                ? "Guardando…"
                : isEdit
                  ? "Guardar cambios"
                  : "Crear regla"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(rutaCampana)}
            >
              Cancelar
            </Button>
          </div>
        </div>

        <ReglaPreview form={form} catalogos={catalogos} productos={productos} />
      </form>
    </>
  );
}

/**
 * Buscador de un producto: escribe el código o parte del nombre y elige de la
 * lista. Usa el <datalist> compartido de la página; con cientos de productos
 * un <select> no se puede recorrer.
 */
function ProductoPicker({
  valor,
  productos,
  onChange,
}: {
  valor: string;
  productos: Map<string, string>;
  onChange: (id: string) => void;
}) {
  const [escrito, setEscrito] = useState(valor);
  const nombre = productos.get(valor);

  return (
    <div className={styles.picker}>
      <input
        className={inputStyles.input}
        list={LISTA_PRODUCTOS}
        value={escrito}
        placeholder="Código o nombre"
        onChange={(e) => {
          const nuevo = e.target.value;
          setEscrito(nuevo);
          const codigo = nuevo.trim();
          onChange(productos.has(codigo) ? codigo : "");
        }}
      />
      {nombre ? (
        <span className={styles.pickerNombre} title={nombre}>
          {nombre}
        </span>
      ) : escrito.trim() ? (
        <span className={styles.pickerAviso}>
          Elige un producto de la lista.
        </span>
      ) : null}
    </div>
  );
}
