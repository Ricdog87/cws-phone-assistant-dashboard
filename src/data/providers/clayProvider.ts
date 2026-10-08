import type { Lead } from '@/domain/types';
import { NotImplementedError, type FieldMapping, type LeadProvider } from './types';

/**
 * Gerüst für Clay. Clay liefert Tabellen mit frei konfigurierbaren Spalten,
 * die Spaltennamen unten sind daher Vorschläge für die Tabellendefinition
 * und müssen mit dem tatsächlichen Clay-Workspace abgeglichen werden.
 *
 * Vorgesehener Weg: Export der angereicherten Tabelle per Webhook oder
 * HTTP-API-Spalte an einen eigenen Endpunkt, von dort Abruf durch diesen Provider.
 * Kein direkter Aufruf aus dem Browser, damit kein Schlüssel im Frontend liegt.
 */
export const CLAY_FIELD_MAPPING: FieldMapping = {
  id: 'Clay Row ID',
  name: 'Company Name',
  industry: 'Industry (normalisiert auf Branchenschlüssel)',
  street: 'Street',
  postalCode: 'Postal Code',
  city: 'City',
  lat: 'Latitude',
  lng: 'Longitude',
  commercialEmployees: null, // offen: Clay liefert Gesamtmitarbeitende, gewerblicher Anteil fehlt
  wearerCount: null, // offen: Schätzregel aus Mitarbeitenden und Branche fachlich festlegen
  phone: 'Company Phone',
  hasDirectDial: 'Direct Phone (vorhanden ja/nein)',
  contactName: 'Contact Full Name',
  contactRole: 'Contact Job Title',
  openPositions: 'Open Jobs Count (gewerbliche Stellen)',
  certification: null, // offen: Quelle für Zertifizierungen klären
  siteExpansion: 'Signal Expansion',
  managementChange: 'Signal Leadership Change',
  isCustomer: null, // kommt aus dem CRM, nicht aus Clay
  owner: null, // kommt aus dem CRM
  lastActivity: null, // kommt aus dem CRM
};

export class ClayProvider implements LeadProvider {
  readonly id = 'clay' as const;
  readonly label = 'Clay';

  async load(): Promise<Lead[]> {
    throw new NotImplementedError(this.label);
  }
}
