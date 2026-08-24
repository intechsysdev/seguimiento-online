import { useMemo } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../store/AuthContext";
import { productosEvaService } from "../../services/eva/productosEvaService";
import type { MobLinea } from "../../types/eva";
import formularios from "../seguridad/Formularios.module.css";

/** Lineas del catalogo, con sus sublineas y cuantos productos cuelgan de cada una. */
export function LineasPage() {
  const { session, tenant } = useAuth();
  const cmpy = session?.tenantActual ?? "";

  const lineas = useApi(
    () => (tenant && cmpy ? productosEvaService.lineas(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );
  const sublineas = useApi(
    () => (tenant && cmpy ? productosEvaService.sublineas(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );
  const productos = useApi(
    () => (tenant && cmpy ? productosEvaService.getListAll(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );

  /** Productos por linea: el conteo es lo que dice si una linea sigue viva. */
  const productosPorLinea = useMemo(() => {
    const mapa = new Map<string, number>();
    (productos.datos ?? []).forEach((p) => {
      const linea = (p.rpr_linea ?? "").trim();
      mapa.set(linea, (mapa.get(linea) ?? 0) + 1);
    });
    return mapa;
  }, [productos.datos]);

  const sublineasPorLinea = useMemo(() => {
    const mapa = new Map<string, string[]>();
    (sublineas.datos ?? []).forEach((s) => {
      const linea = (s.KEY_rsb_linea ?? "").trim();
      if (!mapa.has(linea)) mapa.set(linea, []);
      mapa.get(linea)!.push(s.rsb_descr?.trim() || (s.KEY_rsb_subl ?? "").trim());
    });
    return mapa;
  }, [sublineas.datos]);

  const columnas: Columna<MobLinea>[] = [
    {
      titulo: "Código",
      ancho: "7rem",
      valor: (l) => (l.KEY_rln_linea ?? "").trim(),
      render: (l) => <code>{(l.KEY_rln_linea ?? "").trim()}</code>,
    },
    {
      titulo: "Línea",
      valor: (l) => l.rln_descr ?? "",
      render: (l) => <strong>{l.rln_descr}</strong>,
    },
    {
      titulo: "Productos",
      ancho: "7rem",
      alineacion: "derecha",
      valor: (l) => productosPorLinea.get((l.KEY_rln_linea ?? "").trim()) ?? 0,
      render: (l) => productosPorLinea.get((l.KEY_rln_linea ?? "").trim()) ?? 0,
    },
    {
      titulo: "Sublíneas",
      valor: (l) => (sublineasPorLinea.get((l.KEY_rln_linea ?? "").trim()) ?? []).join(", "),
      render: (l) => {
        const propias = sublineasPorLinea.get((l.KEY_rln_linea ?? "").trim()) ?? [];
        if (propias.length === 0) return "—";
        return (
          <div>
            <strong>{propias.length}</strong>
            <div className={formularios.sub}>{propias.join(", ")}</div>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Productos"
        title="Líneas"
        description="Líneas y sublíneas con las que se clasifica el catálogo."
        actions={<Badge tone="accent">{lineas.datos?.length ?? 0} líneas</Badge>}
      />

      {lineas.error ? (
        <Alert tone="critical">No se pudieron consultar las líneas del API de la compañía.</Alert>
      ) : null}

      <DataTable
        columnas={columnas}
        filas={lineas.datos}
        claveFila={(l) => `${l.KEY_rln_cmpy}-${(l.KEY_rln_linea ?? "").trim()}`}
        cargando={lineas.cargando}
        vacio="La compañía no tiene líneas registradas."
        porPagina={25}
        exportar="lineas-productos"
      />
    </>
  );
}
