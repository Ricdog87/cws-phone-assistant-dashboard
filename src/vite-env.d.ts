/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Kontaktadresse für Nominatim, optional */
  readonly VITE_NOMINATIM_EMAIL?: string;
  /** Standard für das Briefing: rules oder llm */
  readonly VITE_BRIEFING_MODE?: string;
  /** Endpunkt des Briefing-Proxys, Standard /api/briefing */
  readonly VITE_BRIEFING_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
