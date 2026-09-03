import { useMemo, useRef, useState } from "react";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { productosEvaService } from "../../services/eva/productosEvaService";
import type { MobProducto } from "../../types/eva";
import type { TenantDto } from "../../types/seguridad";
import {
  LADO_BIG,
  LADO_NORMAL,
  planAsignacion,
  redimensionarCuadrado,
  type UbicacionImagenes,
} from "../../utils/imagenes";
import estilos from "./Productos.module.css";

const MAX_MB = 10;

interface AsignarFotosProps {
  tenant: TenantDto;
  cmpy: string;
  /** Productos marcados en la tabla. */
  seleccionados: MobProducto[];
  /** Catalogo completo: de el sale si una foto la comparten dos productos. */
  catalogo: MobProducto[];
  ubicacion: UbicacionImagenes | null;
  /** Se llama al terminar, para releer el catalogo y refrescar las miniaturas. */
  onTerminar: () => void;
}

interface Fallo {
  codigo: string;
  motivo: string;
}

/**
 * Pone la misma imagen en varios productos, con un archivo por producto.
 *
 * El adjunto es uno solo, pero se sube tantas veces como productos haya, cada
 * copia con la referencia del suyo (`planAsignacion` decide el nombre). Es lo
 * que permite cambiar despues la foto de uno sin arrastrar a los demas: si se
 * dejara un unico archivo compartido, cambiarlo se los cambiaria a todos.
 *
 * Las subidas van en serie a proposito. Son dos archivos por producto, y
 * lanzarlas todas de golpe serian cientos de peticiones simultaneas contra el
 * servidor de imagenes; en serie ademas se puede decir por donde va y cual
 * fallo.
 */
export function AsignarFotos({
  tenant,
  cmpy,
  seleccionados,
  catalogo,
  ubicacion,
  onTerminar,
}: AsignarFotosProps) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [hechos, setHechos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ ok: string[]; fallidos: Fallo[] } | null>(null);

  const plan = useMemo(
    () => planAsignacion(seleccionados, catalogo, ubicacion),
    [seleccionados, catalogo, ubicacion],
  );

  const aplicables = plan.filter((asignacion) => asignacion.destino);
  const omitidos = plan.filter((asignacion) => !asignacion.destino);
  const nuevos = aplicables.filter((asignacion) => asignacion.url).length;
  const separados = aplicables.filter((asignacion) => asignacion.separado).length;

  async function alElegir(archivo: File) {
    setError(null);
    setResultado(null);

    if (!archivo.type.startsWith("image/")) {
      setError("El archivo elegido no es una imagen.");
      return;
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      setError(`La imagen supera los ${MAX_MB} MB.`);
      return;
    }

    setSubiendo(true);
    setHechos(0);
    try {
      // Se redimensiona una sola vez: lo que cambia por producto es el nombre
      // del archivo, no su contenido.
      const [normal, big] = await Promise.all([
        redimensionarCuadrado(archivo, LADO_NORMAL),
        redimensionarCuadrado(archivo, LADO_BIG),
      ]);

      const ok: string[] = [];
      const fallidos: Fallo[] = omitidos.map((asignacion) => ({
        codigo: asignacion.codigo || "(sin código)",
        motivo: asignacion.motivo ?? "no se pudo deducir dónde guardarla",
      }));

      for (const asignacion of aplicables) {
        const destino = asignacion.destino!;
        try {
          // La grande primero, igual que al cambiar una sola: si falla la
          // segunda, el catalogo sigue mostrando la vieja y se nota antes.
          const resBig = await productosEvaService.subirImagen(
            tenant,
            destino.carpetaBig,
            big,
            destino.archivo,
          );
          if (resBig !== "1") throw new Error(`imagen grande: ${resBig}`);

          const resNormal = await productosEvaService.subirImagen(
            tenant,
            destino.carpeta,
            normal,
            destino.archivo,
          );
          if (resNormal !== "1") throw new Error(`miniatura: ${resNormal}`);

          // Solo cuando el archivo es nuevo: si se reemplazo el que ya tenia,
          // la URL guardada sigue apuntando al sitio correcto.
          if (asignacion.url) {
            await productosEvaService.actualizarImagen(
              tenant,
              cmpy,
              asignacion.codigo,
              asignacion.url,
            );
          }
          ok.push(asignacion.codigo);
        } catch (e) {
          fallidos.push({
            codigo: asignacion.codigo,
            motivo: e instanceof Error ? e.message : "no se pudo guardar",
          });
        } finally {
          setHechos((n) => n + 1);
        }
      }

      setResultado({ ok, fallidos });
      onTerminar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo preparar la imagen.");
    } finally {
      setSubiendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  if (!ubicacion) {
    return (
      <Alert tone="info">
        No se puede deducir dónde guardar las fotos: el catálogo no tiene imágenes de las que leer
        la carpeta y el patrón de nombre.
      </Alert>
    );
  }

  return (
    <div className={estilos.masiva}>
      <Alert tone="info">
        La imagen se guarda una vez por producto, cada copia con su propia referencia. Después se
        puede cambiar la de uno sin tocar la de los demás.
      </Alert>

      <p className={estilos.notaFoto}>
        {aplicables.length} producto{aplicables.length === 1 ? "" : "s"}:{" "}
        {aplicables.length - nuevos} conserva{aplicables.length - nuevos === 1 ? "" : "n"} su
        archivo actual y {nuevos} recibe{nuevos === 1 ? "" : "n"} uno nuevo.
        {separados > 0
          ? ` ${separados} compartía${separados === 1 ? "" : "n"} archivo con otro producto del catálogo, así que se le${separados === 1 ? "" : "s"} crea uno propio.`
          : ""}
      </p>

      {aplicables.length > 0 ? (
        <ul className={estilos.listaDestinos}>
          {aplicables.map((asignacion) => (
            <li key={asignacion.codigo}>
              <code>{asignacion.codigo}</code>
              <span className={estilos.destinoNombre}>{asignacion.descripcion}</span>
              <code className={estilos.destinoArchivo}>
                {asignacion.destino!.carpeta ? `${asignacion.destino!.carpeta}/` : ""}
                {asignacion.destino!.archivo}
              </code>
              {asignacion.separado ? (
                <span className={estilos.marcaNueva}>archivo propio</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {omitidos.length > 0 ? (
        <Alert tone="warning">
          Se omiten {omitidos.length}:{" "}
          {omitidos.map((asignacion) => `${asignacion.codigo} (${asignacion.motivo})`).join("; ")}.
        </Alert>
      ) : null}

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        hidden
        onChange={(evento) => {
          const archivo = evento.target.files?.[0];
          if (archivo) void alElegir(archivo);
        }}
      />

      <Button
        variant="primary"
        onClick={() => entrada.current?.click()}
        disabled={subiendo || aplicables.length === 0}
      >
        {subiendo ? `Subiendo ${hechos} de ${aplicables.length}…` : "Elegir imagen y asignar"}
      </Button>

      {subiendo ? (
        <progress className={estilos.progreso} value={hechos} max={aplicables.length} />
      ) : null}

      <p className={estilos.notaFoto}>
        De cada producto se guardan dos versiones: {LADO_NORMAL}×{LADO_NORMAL} en la carpeta de las
        fotos y {LADO_BIG}×{LADO_BIG} en <code>big</code>.
      </p>

      {error ? <Alert tone="critical">{error}</Alert> : null}

      {resultado ? (
        <>
          {resultado.ok.length > 0 ? (
            <Alert tone="success">
              Foto asignada a {resultado.ok.length} producto{resultado.ok.length === 1 ? "" : "s"}.
            </Alert>
          ) : null}
          {resultado.fallidos.length > 0 ? (
            <Alert tone="critical">
              Quedaron sin foto {resultado.fallidos.length}:{" "}
              {resultado.fallidos.map((fallo) => `${fallo.codigo} (${fallo.motivo})`).join("; ")}.
            </Alert>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
