import { useMemo, useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { Modal } from "../../components/ui/Modal";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { MultiSelect } from "../../components/ui/MultiSelect";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../store/AuthContext";
import { productosEvaService } from "../../services/eva/productosEvaService";
import type { MobProducto } from "../../types/eva";
import type { TenantDto } from "../../types/seguridad";
import { CambiarFoto } from "./CambiarFoto";
import { FotoProducto } from "./FotoProducto";
import formularios from "../seguridad/Formularios.module.css";
import estilos from "./Productos.module.css";

/** Catalogo de productos de la compañía, con su linea, sublinea y foto. */
export function CatalogoPage() {
  const { session, tenant } = useAuth();
  const cmpy = session?.tenantActual ?? "";

  const productos = useApi(
    () => (tenant && cmpy ? productosEvaService.getListAll(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );
  const lineas = useApi(
    () => (tenant && cmpy ? productosEvaService.lineas(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );
  const sublineas = useApi(
    () => (tenant && cmpy ? productosEvaService.sublineas(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );

  const [lineasSel, setLineasSel] = useState<string[]>([]);
  const [sublineasSel, setSublineasSel] = useState<string[]>([]);
  const [detalle, setDetalle] = useState<MobProducto | null>(null);

  /** Codigo de linea -> descripcion, para no mostrar solo el codigo. */
  const nombreLinea = useMemo(() => {
    const mapa = new Map<string, string>();
    (lineas.datos ?? []).forEach((l) => mapa.set((l.KEY_rln_linea ?? "").trim(), l.rln_descr));
    return (codigo: string) => mapa.get((codigo ?? "").trim()) || codigo?.trim() || "—";
  }, [lineas.datos]);

  /** La sublinea solo es unica dentro de su linea, de ahi la clave compuesta. */
  const nombreSublinea = useMemo(() => {
    const mapa = new Map<string, string>();
    (sublineas.datos ?? []).forEach((s) =>
      mapa.set([(s.KEY_rsb_linea ?? "").trim(), (s.KEY_rsb_subl ?? "").trim()].join("|"), s.rsb_descr),
    );
    return (linea: string, subl: string) =>
      mapa.get([(linea ?? "").trim(), (subl ?? "").trim()].join("|")) || subl?.trim() || "—";
  }, [sublineas.datos]);

  // Sublineas de las lineas elegidas: si no, el desplegable las lista todas.
  const sublineasVisibles = useMemo(() => {
    const todas = sublineas.datos ?? [];
    if (lineasSel.length === 0) return todas;
    return todas.filter((s) => lineasSel.includes((s.KEY_rsb_linea ?? "").trim()));
  }, [sublineas.datos, lineasSel]);

  const filas = useMemo(() => {
    let lista = productos.datos ?? [];
    if (lineasSel.length) {
      lista = lista.filter((p) => lineasSel.includes((p.rpr_linea ?? "").trim()));
    }
    if (sublineasSel.length) {
      lista = lista.filter((p) => sublineasSel.includes((p.rpr_subl ?? "").trim()));
    }
    return lista;
  }, [productos.datos, lineasSel, sublineasSel]);

  const conFoto = filas.filter((p) => (p.rpr_urlimagen ?? "").trim()).length;

  const columnas: Columna<MobProducto>[] = [
    /*
      La foto y su accion abren la tabla y quedan ancladas al borde izquierdo.
      Estaban al final, y con siete columnas habia que desplazarse hasta el
      extremo para encontrar como ver o cambiar la imagen.
    */
    {
      titulo: "Foto",
      fija: "izquierda",
      render: (p) => (
        <div className={estilos.celdaFoto}>
          <button
            type="button"
            className={estilos.botonFoto}
            onClick={() => setDetalle(p)}
            title="Ver la ficha del producto"
            aria-label={`Ficha de ${p.rpr_desc}`}
          >
            <FotoProducto url={p.rpr_urlimagen} alt={p.rpr_desc} />
          </button>
          <button type="button" className={estilos.accionFoto} onClick={() => setDetalle(p)}>
            Ver / cambiar foto
          </button>
        </div>
      ),
    },
    {
      titulo: "Código",
      ancho: "9rem",
      valor: (p) => (p.KEY_rpr_id ?? "").trim(),
      render: (p) => <code>{(p.KEY_rpr_id ?? "").trim()}</code>,
    },
    {
      titulo: "Producto",
      valor: (p) => p.rpr_desc ?? "",
      render: (p) => (
        <div>
          <strong>{p.rpr_desc}</strong>
          {(p.rpr_ean ?? "").trim() ? (
            <div className={formularios.sub}>EAN {p.rpr_ean.trim()}</div>
          ) : null}
        </div>
      ),
    },
    {
      titulo: "Línea",
      valor: (p) => nombreLinea(p.rpr_linea),
      render: (p) => nombreLinea(p.rpr_linea),
    },
    {
      titulo: "Sublínea",
      valor: (p) => nombreSublinea(p.rpr_linea, p.rpr_subl),
      render: (p) => nombreSublinea(p.rpr_linea, p.rpr_subl),
    },
    {
      titulo: "Nuevo",
      ancho: "6rem",
      alineacion: "centro",
      valor: (p) => ((p.rpr_nuevo ?? "").trim().toUpperCase() === "S" ? "Sí" : "No"),
      render: (p) =>
        (p.rpr_nuevo ?? "").trim().toUpperCase() === "S" ? <Badge tone="accent">Nuevo</Badge> : "—",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Productos"
        title="Catálogo"
        description="Productos de la compañía, con su línea, sublínea y foto."
        actions={
          <div className={formularios.accionesFila}>
            <Badge tone="accent">{filas.length} productos</Badge>
            <Badge tone={conFoto === filas.length ? "success" : "tier"}>{conFoto} con foto</Badge>
          </div>
        }
      />

      {productos.error ? (
        <Alert tone="critical">No se pudo consultar el catálogo del API de la compañía.</Alert>
      ) : null}

      <div className={formularios.filtros}>
        <MultiSelect
          etiqueta="Líneas"
          opciones={(lineas.datos ?? []).map((l) => ({
            valor: (l.KEY_rln_linea ?? "").trim(),
            etiqueta: l.rln_descr,
          }))}
          seleccion={lineasSel}
          onChange={(sel) => {
            setLineasSel(sel);
            // Las sublineas elegidas pueden no pertenecer a la nueva linea.
            setSublineasSel([]);
          }}
        />

        <MultiSelect
          etiqueta="Sublíneas"
          opciones={sublineasVisibles.map((s) => ({
            valor: (s.KEY_rsb_subl ?? "").trim(),
            etiqueta: s.rsb_descr,
          }))}
          seleccion={sublineasSel}
          onChange={setSublineasSel}
        />
      </div>

      <DataTable
        columnas={columnas}
        filas={filas}
        claveFila={(p) => `${p.KEY_rpr_cmpy}-${(p.KEY_rpr_id ?? "").trim()}`}
        cargando={productos.cargando}
        vacio="No hay productos para los filtros seleccionados."
        porPagina={25}
        exportar="productos"
      />

      <Modal
        abierto={detalle !== null}
        titulo={detalle?.rpr_desc ?? "Producto"}
        descripcion={detalle ? (detalle.KEY_rpr_id ?? "").trim() : undefined}
        onCerrar={() => setDetalle(null)}
        ancho="42rem"
      >
        {detalle && tenant ? (
          <FichaProducto
            producto={detalle}
            tenant={tenant}
            linea={nombreLinea(detalle.rpr_linea)}
            sublinea={nombreSublinea(detalle.rpr_linea, detalle.rpr_subl)}
          />
        ) : null}
      </Modal>
    </>
  );
}

/** Cuerpo de la ficha: la foto grande y los campos que traen contenido. */
function FichaProducto({
  producto,
  tenant,
  linea,
  sublinea,
}: {
  producto: MobProducto;
  tenant: TenantDto;
  linea: string;
  sublinea: string;
}) {
  /*
    El archivo se reemplaza conservando el nombre, asi que la URL no cambia y el
    navegador serviria la foto vieja de su cache. El contador rompe el cache sin
    tocar el dato: solo afecta a esta ficha.
  */
  const [version, setVersion] = useState(0);
  const url = producto.rpr_urlimagen
    ? `${producto.rpr_urlimagen}${producto.rpr_urlimagen.includes("?") ? "&" : "?"}v=${version}`
    : producto.rpr_urlimagen;
  const datos: [string, string][] = [
    // Descripcion y codigo juntos: el codigo solo no dice nada al leer la ficha.
    ["Línea", [linea, (producto.rpr_linea ?? "").trim()].filter(Boolean).join(" · ")],
    ["Sublínea", [sublinea, (producto.rpr_subl ?? "").trim()].filter(Boolean).join(" · ")],
    ["EAN", (producto.rpr_ean ?? "").trim()],
    ["Componentes", (producto.rpr_componentes ?? "").trim()],
    ["Aplicación", (producto.rpr_aplicacion ?? "").trim()],
  ];

  return (
    <div className={estilos.ficha}>
      <FotoProducto url={version ? url : producto.rpr_urlimagen} alt={producto.rpr_desc} tam={200} />

      <dl className={estilos.datos}>
        {datos
          .filter(([, valor]) => valor)
          .map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt>{etiqueta}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        {(producto.rpr_urlvideoclip ?? "").trim() ? (
          <div>
            <dt>Video</dt>
            <dd>
              <a href={producto.rpr_urlvideoclip.trim()} target="_blank" rel="noreferrer">
                Abrir
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      <CambiarFoto
        tenant={tenant}
        urlActual={producto.rpr_urlimagen}
        onSubida={() => setVersion((n) => n + 1)}
      />
    </div>
  );
}
