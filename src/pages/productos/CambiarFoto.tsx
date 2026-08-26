import { useRef, useState } from "react";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { URL_PATH } from "../../api/http";
import { productosEvaService } from "../../services/eva/productosEvaService";
import type { TenantDto } from "../../types/seguridad";
import {
  LADO_BIG,
  LADO_NORMAL,
  partesUrlImagen,
  plantillaImagenes,
  redimensionarCuadrado,
} from "../../utils/imagenes";
import estilos from "./Productos.module.css";

interface CambiarFotoProps {
  tenant: TenantDto;
  /** URL actual del producto: de ella salen la carpeta y el nombre del archivo. */
  urlActual: string;
  /** Codigo del producto, para nombrar la foto de uno que aun no tiene. */
  codigo: string;
  /** Compañía activa: la necesita el API para ubicar el producto. */
  cmpy: string;
  /** Convencion deducida del catalogo (ver `plantillaImagenes`). */
  plantilla: ReturnType<typeof plantillaImagenes>;
  /** Se llama al terminar, para que la ficha vuelva a pedir la imagen. */
  onSubida: () => void;
}

const MAX_MB = 10;

/**
 * Reemplaza la foto de un producto.
 *
 * Sube dos versiones del mismo archivo, con el nombre que ya tiene el producto:
 * 100x100 a la carpeta normal (la que lista el catalogo) y 400x400 a la
 * carpeta `big` (la que abre la ficha, misma convencion que usa la app movil
 * en product_detail.dart). Conservar el nombre es lo que permite no tocar la
 * base: `rpr_urlimagen` sigue apuntando al mismo sitio.
 */
export function CambiarFoto({
  tenant,
  urlActual,
  codigo,
  cmpy,
  plantilla,
  onSubida,
}: CambiarFotoProps) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  /*
    Con foto previa se reemplaza su archivo. Sin ella se crea uno nuevo en la
    misma carpeta del resto del catalogo, con el nombre que marca la convencion
    deducida de los productos que si tienen foto.
  */
  const propias = partesUrlImagen(urlActual, URL_PATH ?? "");
  const esNueva = !propias;
  const partes =
    propias ??
    (plantilla && (codigo ?? "").trim()
      ? {
          carpeta: plantilla.carpeta,
          carpetaBig: plantilla.carpetaBig,
          archivo: `${codigo.trim()}${plantilla.extension}`,
        }
      : null);

  if (!partes) {
    return (
      <Alert tone="info">
        No se puede deducir dónde guardar la foto: el catálogo no tiene imágenes
        de las que leer la carpeta y el patrón de nombre.
      </Alert>
    );
  }

  async function alElegir(archivo: File) {
    setError(null);
    setListo(false);

    if (!archivo.type.startsWith("image/")) {
      setError("El archivo elegido no es una imagen.");
      return;
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      setError(`La imagen supera los ${MAX_MB} MB.`);
      return;
    }

    setSubiendo(true);
    try {
      const [normal, big] = await Promise.all([
        redimensionarCuadrado(archivo, LADO_NORMAL),
        redimensionarCuadrado(archivo, LADO_BIG),
      ]);

      /*
        En serie y la grande primero: si la normal se guarda y la grande falla,
        el catalogo mostraria la foto nueva y la ficha la vieja. Al reves el
        desajuste dura menos y se nota antes.
      */
      const resBig = await productosEvaService.subirImagen(
        tenant,
        partes!.carpetaBig,
        big,
        partes!.archivo,
      );
      if (resBig !== "1") throw new Error(`No se pudo guardar la imagen grande: ${resBig}`);

      const resNormal = await productosEvaService.subirImagen(
        tenant,
        partes!.carpeta,
        normal,
        partes!.archivo,
      );
      if (resNormal !== "1") throw new Error(`No se pudo guardar la miniatura: ${resNormal}`);

      /*
        Solo cuando el producto no tenia foto: hay que apuntar rpr_urlimagen al
        archivo nuevo o el catalogo no lo mostraria. Al reemplazar una existente
        el nombre no cambia y la URL guardada ya es correcta.
      */
      if (esNueva) {
        await productosEvaService.actualizarImagen(
          tenant,
          cmpy,
          codigo,
          `${partes!.carpeta}/${partes!.archivo}`,
        );
      }

      setListo(true);
      onSubida();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div className={estilos.cambiarFoto}>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) void alElegir(archivo);
        }}
      />

      <Button
        variant="secondary"
        size="sm"
        onClick={() => entrada.current?.click()}
        disabled={subiendo}
      >
        {subiendo ? "Subiendo…" : esNueva ? "Cargar foto" : "Cambiar foto"}
      </Button>

      <p className={estilos.notaFoto}>
        Se guardan dos versiones con el nombre <code>{partes.archivo}</code>:{" "}
        {LADO_NORMAL}×{LADO_NORMAL} en <code>{partes.carpeta || "/"}</code> y {LADO_BIG}×{LADO_BIG}{" "}
        en <code>{partes.carpetaBig}</code>.
      </p>

      {error ? <Alert tone="critical">{error}</Alert> : null}
      {listo && !error ? (
        <Alert tone="success">{esNueva ? "Foto creada." : "Foto actualizada."}</Alert>
      ) : null}
    </div>
  );
}
