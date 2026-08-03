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
