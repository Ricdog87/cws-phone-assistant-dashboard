/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Kontaktadresse für Nominatim, optional */
  readonly VITE_NOMINATIM_EMAIL?: string;
  /** Standard für das Briefing: rules oder llm */
  readonly VITE_BRIEFING_MODE?: string;
  /** Endpunkt des Briefing-Proxys, Standard /api/briefing */
  readonly VITE_BRIEFING_ENDPOINT?: string;
  /** Adresse der Salesforce-Oberfläche, etwa https://<firma>.lightning.force.com */
  readonly VITE_SALESFORCE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
