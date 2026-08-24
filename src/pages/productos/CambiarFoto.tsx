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
  redimensionarCuadrado,
} from "../../utils/imagenes";
import estilos from "./Productos.module.css";

interface CambiarFotoProps {
  tenant: TenantDto;
  /** URL actual del producto: de ella salen la carpeta y el nombre del archivo. */
  urlActual: string;
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
export function CambiarFoto({ tenant, urlActual, onSubida }: CambiarFotoProps) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const partes = partesUrlImagen(urlActual, URL_PATH ?? "");

  // Sin URL previa no hay ni carpeta ni nombre que reemplazar, y como el API de
  // productos no permite escribir, un archivo nuevo quedaria sin quien lo lea.
  if (!partes) {
    return (
      <Alert tone="info">
        Este producto no tiene una foto registrada, así que no hay archivo que
        reemplazar. Debe cargarse primero desde el maestro de productos.
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
        {subiendo ? "Subiendo…" : "Cambiar foto"}
      </Button>

      <p className={estilos.notaFoto}>
        Se guardan dos versiones con el nombre <code>{partes.archivo}</code>:{" "}
        {LADO_NORMAL}×{LADO_NORMAL} en <code>{partes.carpeta || "/"}</code> y {LADO_BIG}×{LADO_BIG}{" "}
        en <code>{partes.carpetaBig}</code>.
      </p>

      {error ? <Alert tone="critical">{error}</Alert> : null}
      {listo && !error ? <Alert tone="success">Foto actualizada.</Alert> : null}
    </div>
  );
}
