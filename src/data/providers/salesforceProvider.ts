import type { Lead } from '@/domain/types';
import { NotImplementedError, type FieldMapping, type LeadProvider } from './types';

/**
 * Gerüst für Salesforce. Standardfelder des Objekts Lead, ergänzt um
 * benutzerdefinierte Felder (Endung __c), die im CRM noch anzulegen sind.
 * Bestandskunden kommen aus Account mit aktivem Vertrag.
 *
 * Rückweg der Anrufergebnisse: als Task oder Activity am Lead, siehe
 * docs/architektur.md.
 */
export const SALESFORCE_FIELD_MAPPING: FieldMapping = {
  id: 'Id',
  name: 'Company',
  industry: 'Industry',
  street: 'Street',
  postalCode: 'PostalCode',
  city: 'City',
  lat: 'Latitude',
  lng: 'Longitude',
  commercialEmployees: 'Gewerbliche_Mitarbeitende__c',
  wearerCount: 'Traegerzahl__c',
  phone: 'Phone',
  hasDirectDial: 'Durchwahl_bekannt__c',
  contactName: 'FirstName + LastName',
  contactRole: 'Title',
  openPositions: 'Offene_Stellen__c',
  certification: 'Zertifizierung__c',
  siteExpansion: 'Standorterweiterung__c',
  managementChange: 'GF_Wechsel__c',
  isCustomer: null, // offen: Abgleich über Account mit aktivem Vertrag
  owner: 'Owner.Name',
  lastActivity: 'LastActivityDate',
};

export class SalesforceProvider implements LeadProvider {
  readonly id = 'salesforce' as const;
  readonly label = 'Salesforce';

  async load(): Promise<Lead[]> {
    throw new NotImplementedError(this.label);
  }
}
