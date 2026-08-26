import { useMemo, useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { MultiSelect } from "../../components/ui/MultiSelect";
import { useApi } from "../../hooks/useApi";
import { useUsuariosAsignados } from "../../hooks/useUsuariosAsignados";
import { productosEvaService } from "../../services/eva/productosEvaService";
import type { MobPrecioProducto } from "../../types/eva";
import { FotoProducto } from "./FotoProducto";
import formularios from "../seguridad/Formularios.module.css";

/**
 * Tope de consultas al API. Los precios se piden por cada par
 * (lista, funcionario) y esa combinacion crece rapido: con 10 funcionarios y 5
 * listas serian 50 peticiones. Se limita y se avisa cuantas quedaron fuera.
 */
const MAX_CONSULTAS = 20;

/**
 * Listas de precios y el precio de cada producto.
 *
 * El API resuelve las listas contra un funcionario
 * (ListasPrecios/GetListByCodUsu): no hay variante por compañía. Con varios
 * funcionarios elegidos se consulta cada uno y se unen los resultados, para
 * que los filtros se comporten como los del resto de los modulos.
 */
export function ListasPrecioPage() {
  const {
    usuarios,
    codigosAsignados,
    cargando: cargandoUsuarios,
    error: errorUsuarios,
    cmpy,
    tenant,
  } = useUsuariosAsignados();

  const [funcionariosSel, setFuncionariosSel] = useState<string[]>([]);
  const [listasSel, setListasSel] = useState<string[]>([]);

  // Sin seleccion se usan los asignados, igual que en las demas pantallas.
  const codigos = funcionariosSel.length ? funcionariosSel : codigosAsignados;
  const claveCodigos = codigos.join(",");

  /** Listas visibles: la union de las de cada funcionario elegido. */
  const listas = useApi(async () => {
    if (!tenant || !cmpy || codigos.length === 0) return [];

    const porFuncionario = await Promise.all(
      codigos.map((codUsu) =>
        productosEvaService.listasPrecio(tenant, cmpy, codUsu).catch(() => []),
      ),
    );

    const vistas = new Set<string>();
    return porFuncionario.flat().filter((lista) => {
      const codigo = (lista.KEY_rpri_lista ?? "").trim();
      if (!codigo || vistas.has(codigo)) return false;
      vistas.add(codigo);
      return true;
    });
  }, [tenant?.IDTenant, cmpy, claveCodigos]);

  const codigosLista = useMemo(
    () => (listas.datos ?? []).map((l) => (l.KEY_rpri_lista ?? "").trim()),
    [listas.datos],
  );

  // Sin seleccion se muestran todas las listas disponibles.
  const listasElegidas = listasSel.length
    ? listasSel.filter((l) => codigosLista.includes(l))
    : codigosLista;
  const claveListas = listasElegidas.join(",");

  /** Pares (lista, funcionario) que hay que consultar. */
  const pares = useMemo(() => {
    const salida: [string, string][] = [];
    for (const lista of claveListas ? claveListas.split(",") : []) {
      for (const codUsu of claveCodigos ? claveCodigos.split(",") : []) {
        salida.push([lista, codUsu]);
      }
    }
    return salida;
  }, [claveListas, claveCodigos]);

  const recortadas = Math.max(0, pares.length - MAX_CONSULTAS);

  const precios = useApi(async () => {
    if (!tenant || !cmpy || pares.length === 0) return [];

    const respuestas = await Promise.all(
      pares
        .slice(0, MAX_CONSULTAS)
        .map(([lista, codUsu]) =>
          productosEvaService.preciosDeLista(tenant, cmpy, lista, codUsu).catch(() => []),
        ),
    );

    // El mismo producto llega repetido cuando varios funcionarios comparten
    // lista: se deja una fila por lista + producto.
    const vistas = new Set<string>();
    return respuestas.flat().filter((precio) => {
      const clave = `${(precio.KEY_rpri_lista ?? "").trim()}|${(precio.KEY_rpri_id ?? "").trim()}`;
      if (vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    });
  }, [tenant?.IDTenant, cmpy, claveListas, claveCodigos]);

  const productos = useApi(
    () => (tenant && cmpy ? productosEvaService.getListAll(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );

  /** El endpoint de precios solo trae el codigo: descripcion y foto salen del catalogo. */
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

  const moneda = useMemo(() => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }), []);

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
      // Con varias listas a la vez hay que poder distinguir de cual es el precio.
      titulo: "Lista",
      ancho: "6rem",
      valor: (p) => (p.KEY_rpri_lista ?? "").trim(),
      render: (p) => <code>{(p.KEY_rpri_lista ?? "").trim()}</code>,
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
        actions={
          <div className={formularios.accionesFila}>
            <Badge tone="accent">{precios.datos?.length ?? 0} precios</Badge>
            <Badge tone="tier">{listasElegidas.length} listas</Badge>
          </div>
        }
      />

      {errorUsuarios ? <Alert tone="warning">{errorUsuarios}</Alert> : null}
      {precios.error ? (
        <Alert tone="critical">No se pudieron consultar los precios de la lista.</Alert>
      ) : null}
      {recortadas > 0 ? (
        <Alert tone="warning">
          Son {pares.length} combinaciones de lista y funcionario; se consultaron las primeras{" "}
          {MAX_CONSULTAS}. Afina el filtro para ver el resto.
        </Alert>
      ) : null}

      <div className={formularios.filtros}>
        <MultiSelect
          etiqueta="Funcionarios"
          opciones={usuarios.map((u) => ({
            valor: u.KEY_rusu_codusu,
            etiqueta: `${u.KEY_rusu_codusu} — ${u.rusu_nombre}`,
          }))}
          seleccion={funcionariosSel}
          onChange={(sel) => {
            setFuncionariosSel(sel);
            // Las listas elegidas pueden no existir para los nuevos funcionarios.
            setListasSel([]);
          }}
          vacioSignifica="Asignados"
          cargando={cargandoUsuarios}
        />

        <MultiSelect
          etiqueta="Listas de precios"
          opciones={codigosLista.map((codigo) => ({ valor: codigo, etiqueta: codigo }))}
          seleccion={listasSel}
          onChange={setListasSel}
          cargando={listas.cargando}
        />
      </div>

      {!listas.cargando && codigos.length > 0 && codigosLista.length === 0 ? (
        <Alert tone="info">
          Los funcionarios seleccionados no tienen listas de precios asignadas.
        </Alert>
      ) : (
        <DataTable
          columnas={columnas}
          filas={precios.datos}
          claveFila={(p) => `${(p.KEY_rpri_lista ?? "").trim()}-${(p.KEY_rpri_id ?? "").trim()}`}
          cargando={precios.cargando || cargandoUsuarios}
          vacio="Las listas seleccionadas no tienen productos con precio."
          porPagina={25}
          exportar="precios"
        />
      )}
    </>
  );
}
