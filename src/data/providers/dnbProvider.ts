import type { Lead } from '@/domain/types';
import { NotImplementedError, type FieldMapping, type LeadProvider } from './types';

/**
 * Gerüst für Dun & Bradstreet (Direct+). Feldpfade beziehen sich auf die
 * Firmendaten-Antwort und sind vor der Anbindung gegen den gebuchten
 * Datenblock zu prüfen. Abruf nur über einen eigenen Server, nie direkt
 * aus dem Browser.
 *
 * Bewusst ausgeschlossen: Bonitäts- und Zahlungsdaten. Diese sind ein
 * eigener Governance-Fall und fließen nicht in das Scoring ein.
 */
export const DNB_FIELD_MAPPING: FieldMapping = {
  id: 'duns',
  name: 'primaryName',
  industry: 'primaryIndustryCode (Abbildung auf Branchenschlüssel offen)',
  street: 'primaryAddress.streetAddress.line1',
  postalCode: 'primaryAddress.postalCode',
  city: 'primaryAddress.addressLocality.name',
  lat: 'primaryAddress.latitude',
  lng: 'primaryAddress.longitude',
  commercialEmployees: null, // offen: nur numberOfEmployees gesamt verfügbar
  wearerCount: null, // offen: Schätzregel fachlich festlegen
  phone: 'telephone[0].telephoneNumber',
  hasDirectDial: null, // nicht in D&B, kommt aus Anreicherung oder CRM
  contactName: null, // offen: Kontaktdaten-Block gebucht?
  contactRole: null,
  openPositions: null, // nicht in D&B
  certification: null,
  siteExpansion: null,
  managementChange: null, // offen: über Änderungen der Führungspersonen ableitbar?
  isCustomer: null, // kommt aus dem CRM
};

export class DnbProvider implements LeadProvider {
  readonly id = 'dnb' as const;
  readonly label = 'Dun & Bradstreet';

  async load(): Promise<Lead[]> {
    throw new NotImplementedError(this.label);
  }
}
