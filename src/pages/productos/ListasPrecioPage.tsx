import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { Field } from "../../components/ui/Field";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { useApi } from "../../hooks/useApi";
import { useUsuariosAsignados } from "../../hooks/useUsuariosAsignados";
import { productosEvaService } from "../../services/eva/productosEvaService";
import type { MobPrecioProducto } from "../../types/eva";
import { FotoProducto } from "./FotoProducto";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "../seguridad/Formularios.module.css";

/**
 * Listas de precios y el precio de cada producto.
 *
 * El API solo resuelve las listas contra un funcionario
 * (ListasPrecios/GetListByCodUsu): no hay variante por compañía, asi que la
 * pantalla obliga a elegir uno en vez de inventar un alcance que no existe.
 */
export function ListasPrecioPage() {
  const { usuarios, cargando: cargandoUsuarios, error: errorUsuarios, cmpy, tenant } =
    useUsuariosAsignados();

  const [codUsu, setCodUsu] = useState("");
  const [lista, setLista] = useState("");

  // Primer funcionario asignado como valor inicial, para no abrir en blanco.
  useEffect(() => {
    if (!codUsu && usuarios.length > 0) setCodUsu(usuarios[0].KEY_rusu_codusu);
  }, [usuarios, codUsu]);

  const listas = useApi(
    () =>
      tenant && cmpy && codUsu
        ? productosEvaService.listasPrecio(tenant, cmpy, codUsu)
        : Promise.resolve([]),
    [tenant?.IDTenant, cmpy, codUsu],
  );

  // Al cambiar de funcionario la lista elegida puede no existir para el nuevo.
  useEffect(() => {
    const disponibles = (listas.datos ?? []).map((l) => (l.KEY_rpri_lista ?? "").trim());
    if (disponibles.length === 0) {
      if (lista) setLista("");
      return;
    }
    if (!disponibles.includes(lista)) setLista(disponibles[0]);
  }, [listas.datos, lista]);

  const precios = useApi(
    () =>
      tenant && cmpy && codUsu && lista
        ? productosEvaService.preciosDeLista(tenant, cmpy, lista, codUsu)
        : Promise.resolve([]),
    [tenant?.IDTenant, cmpy, codUsu, lista],
  );

  const productos = useApi(
    () => (tenant && cmpy ? productosEvaService.getListAll(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );

  /** El endpoint de precios solo trae el codigo: la descripcion y la foto salen del catalogo. */
  const catalogo = useMemo(() => {
    const mapa = new Map<string, { desc: string; foto: string }>();
    (productos.datos ?? []).forEach((p) =>
      mapa.set((p.KEY_rpr_id ?? "").trim(), {
        desc: p.rpr_desc ?? "",
        foto: p.rpr_urlimagen ?? "",
      }),
    );
    return mapa;
  }, [productos.datos]);

  const moneda = useMemo(
    () => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }),
    [],
  );

  const columnas: Columna<MobPrecioProducto>[] = [
    {
      titulo: "Foto",
      ancho: "5rem",
      alineacion: "centro",
      render: (p) => {
        const info = catalogo.get((p.KEY_rpri_id ?? "").trim());
        return <FotoProducto url={info?.foto} alt={info?.desc ?? p.KEY_rpri_id} />;
      },
    },
    {
      titulo: "Código",
      ancho: "9rem",
      valor: (p) => (p.KEY_rpri_id ?? "").trim(),
      render: (p) => <code>{(p.KEY_rpri_id ?? "").trim()}</code>,
    },
    {
      titulo: "Producto",
      valor: (p) => catalogo.get((p.KEY_rpri_id ?? "").trim())?.desc ?? "",
      // Un precio puede referirse a un producto que ya no esta en el catalogo.
      render: (p) =>
        catalogo.get((p.KEY_rpri_id ?? "").trim())?.desc ?? (
          <span className={formularios.sub}>No está en el catálogo</span>
        ),
    },
    {
      titulo: "Precio",
      ancho: "9rem",
      alineacion: "derecha",
      valor: (p) => Number(p.rpri_price ?? 0),
      render: (p) => <strong className="tabular">{moneda.format(Number(p.rpri_price ?? 0))}</strong>,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Productos"
        title="Listas de precios"
        description="Precio de cada producto según la lista del funcionario."
        actions={<Badge tone="accent">{precios.datos?.length ?? 0} precios</Badge>}
      />

      {errorUsuarios ? <Alert tone="warning">{errorUsuarios}</Alert> : null}
      {precios.error ? (
        <Alert tone="critical">No se pudieron consultar los precios de la lista.</Alert>
      ) : null}

      <div className={formularios.filtros}>
        <Field label="Funcionario" htmlFor="codUsu">
          <select
            id="codUsu"
            className={inputs.input}
            value={codUsu}
            onChange={(e) => setCodUsu(e.target.value)}
            disabled={cargandoUsuarios || usuarios.length === 0}
          >
            {usuarios.map((u) => (
              <option key={u.KEY_rusu_codusu} value={u.KEY_rusu_codusu}>
                {u.KEY_rusu_codusu} — {u.rusu_nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Lista de precios" htmlFor="lista">
          <select
            id="lista"
            className={inputs.input}
            value={lista}
            onChange={(e) => setLista(e.target.value)}
            disabled={listas.cargando || (listas.datos?.length ?? 0) === 0}
          >
            {(listas.datos ?? []).map((l) => (
              <option key={l.KEY_rpri_lista} value={(l.KEY_rpri_lista ?? "").trim()}>
                {(l.KEY_rpri_lista ?? "").trim()}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {!listas.cargando && codUsu && (listas.datos?.length ?? 0) === 0 ? (
        <Alert tone="info">El funcionario seleccionado no tiene listas de precios asignadas.</Alert>
      ) : (
        <DataTable
          columnas={columnas}
          filas={precios.datos}
          claveFila={(p) => `${p.KEY_rpri_lista}-${(p.KEY_rpri_id ?? "").trim()}`}
          cargando={precios.cargando || cargandoUsuarios}
          vacio="La lista seleccionada no tiene productos con precio."
          porPagina={25}
          exportar={`precios-${lista || "lista"}`}
        />
      )}
    </>
  );
}
