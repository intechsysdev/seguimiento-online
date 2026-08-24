/**
 * Catalogo de productos del API por compañía.
 *
 * Son los mismos endpoints que consume la app movil (lib/helpers/
 * productos_helper.dart, lineas_helper.dart, listaprecio_helper.dart y
 * preciosproducto_helper.dart); aca se usan en modo consulta.
 */
import { tenantHttp, tenantUpload } from "../../api/tenantHttp";
import type {
  MobLinea,
  MobListaPrecio,
  MobPrecioProducto,
  MobProducto,
  MobSublinea,
} from "../../types/eva";
import type { TenantDto } from "../../types/seguridad";

export const productosEvaService = {
  /** Catalogo completo de la compañía (Productos/GetListAll). */
  getListAll: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<MobProducto[]>(tenant, `api/v1/Productos/GetListAll/${cmpy}`),

  /** Solo los productos asignados a un funcionario. */
  getListByVendedor: (tenant: TenantDto, cmpy: string, codUsu: string) =>
    tenantHttp.get<MobProducto[]>(
      tenant,
      `api/v1/Productos/GetListByVendedor/${cmpy}/${encodeURIComponent(codUsu)}`,
    ),

  lineas: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<MobLinea[]>(tenant, `api/v1/LineasProductos/GetList/${cmpy}`),

  sublineas: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<MobSublinea[]>(tenant, `api/v1/SubLineas/GetList/${cmpy}`),

  /**
   * Listas de precios visibles para un funcionario. El API no expone una
   * variante por compañía: la lista siempre se resuelve contra un vendedor.
   */
  listasPrecio: (tenant: TenantDto, cmpy: string, codUsu: string) =>
    tenantHttp.get<MobListaPrecio[]>(
      tenant,
      `api/v1/ListasPrecios/GetListByCodUsu/${cmpy}/${encodeURIComponent(codUsu)}`,
    ),

  /**
   * Sube un archivo al servidor de imagenes.
   *
   * `folder` es la carpeta relativa a la raiz que sirve las URLs de
   * `rpr_urlimagen`, y el nombre del archivo decide que foto se reemplaza: al
   * conservar el mismo nombre, la URL que ya tiene el producto sigue siendo
   * valida y no hace falta escribir en la base (el API de productos es de solo
   * lectura). Es el mismo endpoint que usa la app movil para la foto del
   * cliente (FileUpload/Upload?folder=clientes/{cmpy}).
   *
   * Devuelve "1" cuando el archivo quedo guardado; cualquier otro texto es el
   * mensaje de error que el endpoint devuelve con codigo 200.
   */
  subirImagen: (tenant: TenantDto, carpeta: string, archivo: Blob, nombre: string) =>
    tenantUpload(
      tenant,
      `api/v1/FileUpload/Upload?folder=${encodeURIComponent(carpeta)}`,
      archivo,
      nombre,
    ),

  /** Precios de cada producto dentro de una lista. */
  preciosDeLista: (tenant: TenantDto, cmpy: string, lista: string, codUsu: string) =>
    tenantHttp.get<MobPrecioProducto[]>(
      tenant,
      `api/v1/ListasPrecios/GetListProducts/${cmpy}/${encodeURIComponent(lista)}/${encodeURIComponent(codUsu)}`,
    ),
};
