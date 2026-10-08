import { describe, expect, it } from 'vitest';
import { calendarUrl, normalizeSalesforceUrl, salesforceObjectOf } from '@/domain/salesforce';

const BASE = 'https://beispiel.lightning.force.com';
const ACCOUNT = '001000000000001AAA';
const LEAD = '00Q000000000001AAA';

describe('salesforceObjectOf', () => {
  it('erkennt Account, Lead und Kontakt am Präfix', () => {
    expect(salesforceObjectOf(ACCOUNT)).toBe('Account');
    expect(salesforceObjectOf(LEAD)).toBe('Lead');
    expect(salesforceObjectOf('003000000000001')).toBe('Contact');
  });

  it('liefert null für Demo-IDs und Unbekanntes', () => {
    expect(salesforceObjectOf('DEMO-057')).toBeNull();
    expect(salesforceObjectOf('006000000000001AAA')).toBeNull();
    expect(salesforceObjectOf(null)).toBeNull();
  });
});

describe('normalizeSalesforceUrl', () => {
  it('nimmt nur https-Adressen von Salesforce und kürzt auf die Domain', () => {
    expect(normalizeSalesforceUrl(`${BASE}/lightning/page/home`)).toBe(BASE);
    expect(normalizeSalesforceUrl('https://firma.my.salesforce.com')).toBe(
      'https://firma.my.salesforce.com',
    );
    expect(normalizeSalesforceUrl('http://beispiel.lightning.force.com')).toBeNull();
    expect(normalizeSalesforceUrl('https://example.org')).toBeNull();
    expect(normalizeSalesforceUrl('')).toBeNull();
    expect(normalizeSalesforceUrl('kein link')).toBeNull();
  });
});

describe('calendarUrl', () => {
  it('öffnet den Kalender in der Wochenansicht ab dem Tag', () => {
    expect(calendarUrl(BASE, '2026-10-08')).toBe(
      `${BASE}/lightning/o/Event/home?startDate=2026-10-08&view=week`,
    );
  });
});
