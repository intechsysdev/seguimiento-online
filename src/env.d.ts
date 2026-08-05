/** Version de package.json, inyectada por Vite (ver define en vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_SEGURIDAD: string;
  readonly VITE_URL_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
