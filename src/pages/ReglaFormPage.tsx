import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { Field } from "../components/ui/Field";
import { Switch } from "../components/ui/Switch";
import inputStyles from "../components/ui/inputs.module.css";
import { IconPlus, IconTrash } from "../components/icons";
import { useBonificados } from "../store/BonificadosContext";
import type { Beneficio, GrupoMixto, Linea, Nivel, Producto, Sublinea, TipoAgrupacion } from "../types/bonificados";
import { ReglaPreview } from "./ReglaPreview";
import styles from "./ReglaFormPage.module.css";

let localIdCounter = 0;
function newLocalId() {
  localIdCounter += 1;
  return `tmp_${localIdCounter}`;
}

function emptyBeneficio(): Beneficio {
  return { id: newLocalId(), productoCodigo: "", productoNombre: "", cantidad: 1, multiOpcion: false, opciones: [] };
}

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function toggleObjInArray<T extends { id: string }>(arr: T[], item: T): T[] {
  return arr.some((x) => x.id === item.id) ? arr.filter((x) => x.id !== item.id) : [...arr, item];
}

const AGRUPACION_OPTIONS: { value: TipoAgrupacion; label: string }[] = [
  { value: "PRODUCTO", label: "Producto específico" },
  { value: "LINEA", label: "Línea" },
  { value: "SUBLINEA", label: "Sublínea" },
  { value: "GRUPO_MIXTO", label: "Grupo mixto" },
];

interface FormState {
  nombreRegla: string;
  descripcion: string;
  activa: boolean;
  canales: string[];
  regiones: string[];
  territorios: string[];
  tiposCliente: string[];
  tipoAgrupacion: TipoAgrupacion;
  productosSeleccionados: Producto[];
  lineasSeleccionadas: Linea[];
  sublineasSeleccionadas: Sublinea[];
  grupoSeleccionado?: GrupoMixto;
  usaEscalonamiento: boolean;
  cantidadMinima?: number;
  montoMinimo?: number;
  beneficiosSimples: Beneficio[];
  niveles: Nivel[];
  precioMinimoBonificado?: number;
  stockAsignado?: number;
  limiteMensualActivo: boolean;
  limiteMensualCantidad?: number;
}

export function ReglaFormPage() {
  const { campanaId, reglaId } = useParams();
  const isEdit = Boolean(reglaId);
  const navigate = useNavigate();
  const { getCampana, getRegla, catalogos, addRegla, updateRegla } = useBonificados();

  const campana = getCampana(campanaId!);
  const existing = isEdit ? getRegla(reglaId!) : undefined;

  const [lineaFiltro, setLineaFiltro] = useState(existing?.sublineasSeleccionadas[0]?.lineaId ?? "");
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>(() => ({
    nombreRegla: existing?.nombreRegla ?? "",
    descripcion: existing?.descripcion ?? "",
    activa: existing?.activa ?? true,
    canales: existing?.canales ?? [],
    regiones: existing?.regiones ?? [],
    territorios: existing?.territorios ?? [],
    tiposCliente: existing?.tiposCliente ?? [],
    tipoAgrupacion: existing?.tipoAgrupacion ?? "PRODUCTO",
    productosSeleccionados: existing?.productosSeleccionados ?? [],
    lineasSeleccionadas: existing?.lineasSeleccionadas ?? [],
    sublineasSeleccionadas: existing?.sublineasSeleccionadas ?? [],
    grupoSeleccionado: existing?.grupoSeleccionado,
    usaEscalonamiento: existing?.usaEscalonamiento ?? false,
    cantidadMinima: existing?.cantidadMinima,
    montoMinimo: existing?.montoMinimo,
    beneficiosSimples: existing?.beneficiosSimples ?? [emptyBeneficio()],
    niveles: existing?.niveles ?? [],
    precioMinimoBonificado: existing?.precioMinimoBonificado,
    stockAsignado: existing?.stockAsignado,
    limiteMensualActivo: existing?.limiteMensualActivo ?? false,
    limiteMensualCantidad: existing?.limiteMensualCantidad,
  }));

  if (!campana) return <Navigate to="/" replace />;
  if (isEdit && !existing) return <Navigate to={`/campanas/${campanaId}`} replace />;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addBeneficioSimple() {
    set("beneficiosSimples", [...form.beneficiosSimples, emptyBeneficio()]);
  }
  function updateBeneficioSimple(idx: number, patch: Partial<Beneficio>) {
    set("beneficiosSimples", form.beneficiosSimples.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }
  function removeBeneficioSimple(idx: number) {
    set("beneficiosSimples", form.beneficiosSimples.filter((_, i) => i !== idx));
  }

  function addNivel() {
    const nuevo: Nivel = { id: newLocalId(), nivel: form.niveles.length + 1, beneficios: [emptyBeneficio()] };
    set("niveles", [...form.niveles, nuevo]);
  }
  function removeNivel(idx: number) {
    set(
      "niveles",
      form.niveles.filter((_, i) => i !== idx).map((n, i) => ({ ...n, nivel: i + 1 })),
    );
  }
  function updateNivel(idx: number, patch: Partial<Nivel>) {
    set("niveles", form.niveles.map((n, i) => (i === idx ? { ...n, ...patch } : n)));
  }
  function updateNivelBeneficio(idx: number, patch: Partial<Beneficio>) {
    set(
      "niveles",
      form.niveles.map((n, i) => (i === idx ? { ...n, beneficios: [{ ...n.beneficios[0], ...patch }] } : n)),
    );
  }

  const sublineasDisponibles = catalogos.sublineas.filter((s) => s.lineaId === lineaFiltro);

  const agrupacionTexto = (() => {
    switch (form.tipoAgrupacion) {
      case "PRODUCTO":
        return form.productosSeleccionados.map((p) => p.nombre).join(", ") || "(sin productos seleccionados)";
      case "LINEA":
        return form.lineasSeleccionadas.map((l) => l.nombre).join(", ") || "(sin líneas seleccionadas)";
      case "SUBLINEA":
        return form.sublineasSeleccionadas.map((s) => s.nombre).join(", ") || "(sin sublíneas seleccionadas)";
      case "GRUPO_MIXTO":
        return form.grupoSeleccionado?.nombre ?? "(sin grupo seleccionado)";
    }
  })();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nombreRegla.trim()) {
      setError("El nombre de la regla es obligatorio.");
      return;
    }
    if (form.usaEscalonamiento && form.niveles.length === 0) {
      setError("Agrega al menos un nivel de escalonamiento.");
      return;
    }
    if (!form.usaEscalonamiento && form.beneficiosSimples.every((b) => !b.productoNombre.trim())) {
      setError("Agrega al menos un beneficio con producto bonificado.");
      return;
    }
    setError("");

    const payload = { ...form, campanaId: campana!.id };

    if (existing) {
      updateRegla({ ...existing, ...payload });
    } else {
      addRegla(payload);
    }
    navigate(`/campanas/${campana!.id}`);
  }

  return (
    <>
      <PageHeader
        eyebrow={campana.nombre}
        title={isEdit ? "Editar regla" : "Nueva regla de bonificación"}
        backTo={`/campanas/${campana.id}`}
        backLabel="Reglas"
      />

      <form onSubmit={handleSubmit} className={styles.layout}>
        <div className={styles.form}>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>
                <span className={styles.sectionNum}>1</span>Información general
              </span>
            </div>
            <Field label="Nombre de la regla" htmlFor="nombreRegla">
              <input
                id="nombreRegla"
                className={inputStyles.input}
                value={form.nombreRegla}
                onChange={(e) => set("nombreRegla", e.target.value)}
                placeholder="Ej: Escalonamiento Tintes 5 niveles"
              />
            </Field>
            <Field label="Descripción" optional htmlFor="descripcionRegla">
              <textarea
                id="descripcionRegla"
                className={inputStyles.textarea}
                value={form.descripcion}
                onChange={(e) => set("descripcion", e.target.value)}
              />
            </Field>
            <div className={styles.switchCard}>
              <Switch checked={form.activa} onChange={(v) => set("activa", v)} label="Regla activa" />
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>
                <span className={styles.sectionNum}>2</span>Alcance
              </span>
              <span className={styles.sectionHint}>Sin selección = aplica a todos</span>
            </div>
            <div className={styles.scopeGrid}>
              <div className={styles.scopeGroup}>
                <span className={styles.scopeLabel}>Canales</span>
                <div className={styles.chipWrap}>
                  {catalogos.canales.map((c) => (
                    <Chip key={c} selected={form.canales.includes(c)} onClick={() => set("canales", toggleInArray(form.canales, c))}>
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className={styles.scopeGroup}>
                <span className={styles.scopeLabel}>Regiones</span>
                <div className={styles.chipWrap}>
                  {catalogos.regiones.map((r) => (
                    <Chip key={r} selected={form.regiones.includes(r)} onClick={() => set("regiones", toggleInArray(form.regiones, r))}>
                      {r}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className={styles.scopeGroup}>
                <span className={styles.scopeLabel}>Territorios</span>
                <div className={styles.chipWrap}>
                  {catalogos.territorios.map((t) => (
                    <Chip key={t} selected={form.territorios.includes(t)} onClick={() => set("territorios", toggleInArray(form.territorios, t))}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className={styles.scopeGroup}>
                <span className={styles.scopeLabel}>Tipo de cliente</span>
                <div className={styles.chipWrap}>
                  {catalogos.tiposCliente.map((t) => (
                    <Chip key={t} selected={form.tiposCliente.includes(t)} onClick={() => set("tiposCliente", toggleInArray(form.tiposCliente, t))}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>
                <span className={styles.sectionNum}>3</span>Agrupación de productos
              </span>
            </div>
            <div className={styles.segmented}>
              {AGRUPACION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={[styles.segmentBtn, form.tipoAgrupacion === opt.value ? styles.segmentActive : ""].join(" ")}
                  onClick={() => set("tipoAgrupacion", opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {form.tipoAgrupacion === "PRODUCTO" && (
              <div className={styles.chipWrap}>
                {catalogos.productos.map((p) => (
                  <Chip
                    key={p.id}
                    selected={form.productosSeleccionados.some((x) => x.id === p.id)}
                    onClick={() => set("productosSeleccionados", toggleObjInArray(form.productosSeleccionados, p))}
                  >
                    [{p.codigo}] {p.nombre}
                  </Chip>
                ))}
              </div>
            )}

            {form.tipoAgrupacion === "LINEA" && (
              <div className={styles.chipWrap}>
                {catalogos.lineas.map((l) => (
                  <Chip
                    key={l.id}
                    selected={form.lineasSeleccionadas.some((x) => x.id === l.id)}
                    onClick={() => set("lineasSeleccionadas", toggleObjInArray(form.lineasSeleccionadas, l))}
                  >
                    {l.nombre}
                  </Chip>
                ))}
              </div>
            )}

            {form.tipoAgrupacion === "SUBLINEA" && (
              <>
                <Field label="Línea padre" htmlFor="lineaFiltro">
                  <select id="lineaFiltro" className={inputStyles.select} value={lineaFiltro} onChange={(e) => setLineaFiltro(e.target.value)}>
                    <option value="">Seleccionar línea...</option>
                    {catalogos.lineas.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className={styles.chipWrap}>
                  {sublineasDisponibles.length === 0 && <span className={styles.sectionHint}>Selecciona una línea para ver sus sublíneas.</span>}
                  {sublineasDisponibles.map((s) => (
                    <Chip
                      key={s.id}
                      selected={form.sublineasSeleccionadas.some((x) => x.id === s.id)}
                      onClick={() => set("sublineasSeleccionadas", toggleObjInArray(form.sublineasSeleccionadas, s))}
                    >
                      {s.nombre}
                    </Chip>
                  ))}
                </div>
              </>
            )}

            {form.tipoAgrupacion === "GRUPO_MIXTO" && (
              <div className={styles.chipWrap}>
                {catalogos.grupos.map((g) => (
                  <Chip key={g.id} selected={form.grupoSeleccionado?.id === g.id} onClick={() => set("grupoSeleccionado", g)}>
                    {g.nombre} ({g.cantidadProductos} productos)
                  </Chip>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>
                <span className={styles.sectionNum}>4</span>Condición y beneficios
              </span>
            </div>
            <div className={styles.switchCard}>
              <Switch
                checked={form.usaEscalonamiento}
                onChange={(v) => set("usaEscalonamiento", v)}
                label="Usar escalonamiento por niveles"
                hint="A mayor volumen comprado, mayor bonificación."
              />
            </div>

            {!form.usaEscalonamiento && (
              <>
                <div className={styles.row}>
                  <Field label="Cantidad mínima" optional htmlFor="cantidadMinima">
                    <input
                      id="cantidadMinima"
                      type="number"
                      min={0}
                      className={inputStyles.input}
                      value={form.cantidadMinima ?? ""}
                      onChange={(e) => set("cantidadMinima", e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </Field>
                  <Field label="Monto mínimo" optional htmlFor="montoMinimo">
                    <div className={inputStyles.prefixWrap}>
                      <span className={inputStyles.prefix}>$</span>
                      <input
                        id="montoMinimo"
                        type="number"
                        min={0}
                        className={inputStyles.input}
                        value={form.montoMinimo ?? ""}
                        onChange={(e) => set("montoMinimo", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </Field>
                </div>

                <span className={styles.miniLabel}>Beneficios (productos bonificados)</span>
                <div className={styles.benefList}>
                  {form.beneficiosSimples.map((b, idx) => (
                    <div key={b.id} className={styles.benefRow}>
                      <Field label="Producto bonificado">
                        <input
                          className={inputStyles.input}
                          value={b.productoNombre}
                          onChange={(e) => updateBeneficioSimple(idx, { productoNombre: e.target.value })}
                          placeholder="Nombre del producto"
                        />
                      </Field>
                      <Field label="Código" optional>
                        <input
                          className={inputStyles.input}
                          value={b.productoCodigo}
                          onChange={(e) => updateBeneficioSimple(idx, { productoCodigo: e.target.value })}
                        />
                      </Field>
                      <Field label="Cantidad">
                        <input
                          type="number"
                          min={1}
                          className={inputStyles.input}
                          value={b.cantidad}
                          onChange={(e) => updateBeneficioSimple(idx, { cantidad: Number(e.target.value) })}
                        />
                      </Field>
                      <Switch checked={b.multiOpcion} onChange={(v) => updateBeneficioSimple(idx, { multiOpcion: v })} label="Opción múltiple" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeBeneficioSimple(idx)} aria-label="Quitar beneficio">
                        <IconTrash width={16} height={16} />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="secondary" size="sm" className={styles.addRowBtn} onClick={addBeneficioSimple}>
                  <IconPlus width={14} height={14} />
                  Agregar beneficio
                </Button>
              </>
            )}

            {form.usaEscalonamiento && (
              <>
                <div className={styles.escalera}>
                  {form.niveles.map((nivel, idx) => (
                    <div key={nivel.id} className={styles.nivelCard}>
                      <span className={styles.nivelNode}>{idx + 1}</span>
                      <div className={styles.nivelHead}>
                        <span className={styles.nivelTitle}>Nivel {idx + 1}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeNivel(idx)} aria-label="Quitar nivel">
                          <IconTrash width={16} height={16} />
                        </Button>
                      </div>
                      <div className={styles.row3}>
                        <Field label="Cantidad mínima" optional>
                          <input
                            type="number"
                            min={0}
                            className={inputStyles.input}
                            value={nivel.cantidadMinima ?? ""}
                            onChange={(e) => updateNivel(idx, { cantidadMinima: e.target.value ? Number(e.target.value) : undefined })}
                          />
                        </Field>
                        <Field label="Monto mínimo" optional>
                          <input
                            type="number"
                            min={0}
                            className={inputStyles.input}
                            value={nivel.montoMinimo ?? ""}
                            onChange={(e) => updateNivel(idx, { montoMinimo: e.target.value ? Number(e.target.value) : undefined })}
                          />
                        </Field>
                        <Field label="Cantidad bonificada">
                          <input
                            type="number"
                            min={1}
                            className={inputStyles.input}
                            value={nivel.beneficios[0]?.cantidad ?? 1}
                            onChange={(e) => updateNivelBeneficio(idx, { cantidad: Number(e.target.value) })}
                          />
                        </Field>
                      </div>
                      <div className={styles.row}>
                        <Field label="Producto bonificado">
                          <input
                            className={inputStyles.input}
                            value={nivel.beneficios[0]?.productoNombre ?? ""}
                            onChange={(e) => updateNivelBeneficio(idx, { productoNombre: e.target.value })}
                            placeholder="Ej: Tinte Negro 60ml"
                          />
                        </Field>
                        <Field label="Código" optional>
                          <input
                            className={inputStyles.input}
                            value={nivel.beneficios[0]?.productoCodigo ?? ""}
                            onChange={(e) => updateNivelBeneficio(idx, { productoCodigo: e.target.value })}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="secondary" size="sm" className={styles.addRowBtn} onClick={addNivel}>
                  <IconPlus width={14} height={14} />
                  Agregar nivel
                </Button>
              </>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle}>
                <span className={styles.sectionNum}>5</span>Otras condiciones
              </span>
            </div>
            <div className={styles.row3}>
              <Field label="Precio mínimo del bonificado" optional>
                <div className={inputStyles.prefixWrap}>
                  <span className={inputStyles.prefix}>$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputStyles.input}
                    value={form.precioMinimoBonificado ?? ""}
                    onChange={(e) => set("precioMinimoBonificado", e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </Field>
              <Field label="Stock asignado" optional hint="Vacío = sin límite">
                <input
                  type="number"
                  min={0}
                  className={inputStyles.input}
                  value={form.stockAsignado ?? ""}
                  onChange={(e) => set("stockAsignado", e.target.value ? Number(e.target.value) : undefined)}
                />
              </Field>
              <div>
                <div className={styles.switchCard}>
                  <Switch checked={form.limiteMensualActivo} onChange={(v) => set("limiteMensualActivo", v)} label="Límite mensual" />
                </div>
                {form.limiteMensualActivo && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <Field label="Veces al mes por cliente">
                      <input
                        type="number"
                        min={1}
                        className={inputStyles.input}
                        value={form.limiteMensualCantidad ?? 1}
                        onChange={(e) => set("limiteMensualCantidad", Number(e.target.value))}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          </section>

          {error && <p style={{ color: "var(--color-critical)", fontSize: "var(--text-sm)" }}>{error}</p>}

          <div className={styles.formActions}>
            <Button type="submit" variant="primary">
              {isEdit ? "Guardar cambios" : "Crear regla"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate(`/campanas/${campana.id}`)}>
              Cancelar
            </Button>
          </div>
        </div>

        <ReglaPreview
          nombreRegla={form.nombreRegla}
          tipoAgrupacion={form.tipoAgrupacion}
          agrupacionTexto={agrupacionTexto}
          canales={form.canales}
          regiones={form.regiones}
          territorios={form.territorios}
          tiposCliente={form.tiposCliente}
          usaEscalonamiento={form.usaEscalonamiento}
          cantidadMinima={form.cantidadMinima}
          montoMinimo={form.montoMinimo}
          beneficiosSimples={form.beneficiosSimples}
          niveles={form.niveles}
          precioMinimoBonificado={form.precioMinimoBonificado}
          stockAsignado={form.stockAsignado}
          stockConsumido={existing?.stockConsumido ?? 0}
          limiteMensualActivo={form.limiteMensualActivo}
          limiteMensualCantidad={form.limiteMensualCantidad}
        />
      </form>
    </>
  );
}
