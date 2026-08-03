interface ImportMetaEnv {
  readonly VITE_API_SEGURIDAD: string;
  readonly VITE_URL_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
