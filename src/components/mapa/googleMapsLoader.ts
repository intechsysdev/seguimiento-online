/**
 * Carga del SDK de Google Maps.
 *
 * En el MVC cada vista incluia
 * `<script src="maps.googleapis.com/maps/api/js?key=@ViewBag.ApiKeyGoogle&libraries=places">`.
 * Aca la key llega en tiempo de ejecucion desde ApplicationConfig, asi que el
 * script se inyecta una sola vez y las siguientes llamadas reutilizan la promesa.
 */
let promesa: Promise<void> | null = null;
let keyUsada = "";

export function cargarGoogleMaps(apiKey: string): Promise<void> {
  if (!apiKey) return Promise.reject(new Error("Falta la API key de Google Maps"));

  if (promesa && keyUsada === apiKey) return promesa;

  keyUsada = apiKey;
  promesa = new Promise<void>((resolver, rechazar) => {
    if (typeof window !== "undefined" && window.google?.maps) {
      resolver();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.onload = () => resolver();
    script.onerror = () => {
      promesa = null;
      rechazar(new Error("No se pudo cargar Google Maps"));
    };
    document.head.appendChild(script);
  });

  return promesa;
}
