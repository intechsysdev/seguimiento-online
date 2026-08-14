/**
 * Latitud maxima que se admite como punto de un cliente.
 *
 * No hay operacion comercial cerca de los polos, y es justo donde aterrizan los
 * registros con la latitud y la longitud intercambiadas: una longitud de
 * Colombia o Peru (~70-80 O) leida como latitud da un punto en la Antartida.
 * Como esas longitudes siempre superan los 60 grados, el limite detecta el
 * cambiazo sin tener que fijar un pais en el codigo.
 */
const LATITUD_MAXIMA = 60;

/**
 * Si el par sirve para dibujar un punto en el mapa.
 *
 * El ERP deja la latitud y la longitud en blanco, en cero, invertidas o con
 * basura cuando el cliente nunca se georreferencio bien. Comprobar solo que el
 * numero no sea cero deja pasar cosas como lat 999 o lat -74, que Google
 * dibuja igual y ponen un marcador donde no hay ningun cliente.
 */
export function esCoordenada(lat: unknown, lng: unknown) {
  const latitud = Number(lat);
  const longitud = Number(lng);
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) return false;
  // Un cero en cualquiera de los dos es "sin capturar", no el golfo de Guinea.
  if (latitud === 0 || longitud === 0) return false;
  return Math.abs(latitud) <= LATITUD_MAXIMA && Math.abs(longitud) <= 180;
}

/**
 * El registro trae algo escrito en las coordenadas, pero no forma un punto
 * usable. Se separa de "sin coordenadas" porque no es lo mismo: aqui hay un
 * dato mal capturado en el maestro de clientes, y conviene decirlo para que
 * alguien lo corrija en el ERP.
 */
export function coordenadaInvalida(lat: unknown, lng: unknown) {
  const hayDato = Number(lat) !== 0 && Number(lng) !== 0 && String(lat ?? "").trim() !== "";
  return hayDato && !esCoordenada(lat, lng);
}

/**
 * Distancia haversine, migrada de RutasController.CalcularDistancia.
 *
 * OJO: el original divide el resultado entre 100 antes de devolverlo, asi que
 * la unidad no son kilometros reales. Se conserva el calculo tal cual para que
 * la comparacion contra el parametro de distancia siga dando el mismo resultado
 * que en el MVC.
 */
export function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radioTierra = 6371.0;
  const rad = Math.PI / 180;

  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return (radioTierra * c) / 100;
}

/**
 * Migra RutasController.GetVisitaPresencial: la visita es presencial si el GPS
 * de la visita esta dentro del radio configurado alrededor del cliente.
 */
export function esVisitaPresencial(
  latCliente: string,
  lonCliente: string,
  latVisita: string,
  lonVisita: string,
  distanciaBase: number,
) {
  if (latCliente === "0" || latVisita === "0" || !latCliente || !latVisita) return false;

  const distancia = calcularDistancia(
    Number(latCliente),
    Number(lonCliente),
    Number(latVisita),
    Number(lonVisita),
  );

  return distancia <= distanciaBase;
}
