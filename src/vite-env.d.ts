/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Kontaktadresse für Nominatim, optional */
  readonly VITE_NOMINATIM_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
