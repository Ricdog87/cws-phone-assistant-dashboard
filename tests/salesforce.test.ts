import { describe, expect, it } from 'vitest';
import {
  demoAccountId,
  normalizeSalesforceUrl,
  recordUrl,
  salesforceObjectOf,
} from '@/domain/salesforce';

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

describe('Links in die Salesforce-Oberfläche', () => {
  const BASE = 'https://cws-workwear.lightning.force.com';

  it('öffnet Account, Lead und Kontakt direkt als Datensatz', () => {
    expect(recordUrl(BASE, ACCOUNT)).toBe(`${BASE}/lightning/r/Account/${ACCOUNT}/view`);
    expect(recordUrl(BASE, LEAD)).toBe(`${BASE}/lightning/r/Lead/${LEAD}/view`);
    expect(recordUrl(BASE, 'DEMO-057')).toBeNull();
    expect(recordUrl(BASE, null)).toBeNull();
  });

  it('gibt Demo-Leads eine Platzhalter-ID im Format einer Account-ID', () => {
    const id = demoAccountId('DEMO-057');
    expect(id).toMatch(/^001DEMO\d{8}$/);
    expect(salesforceObjectOf(id)).toBe('Account');
    expect(demoAccountId('DEMO-057')).toBe(id);
    expect(demoAccountId('DEMO-058')).not.toBe(id);
  });

  it('nimmt nur https-Adressen von Salesforce und kürzt auf die Domain', () => {
    expect(normalizeSalesforceUrl(`${BASE}/lightning/page/home`)).toBe(BASE);
    expect(normalizeSalesforceUrl('http://cws-workwear.lightning.force.com')).toBeNull();
    expect(normalizeSalesforceUrl('https://example.org')).toBeNull();
    expect(normalizeSalesforceUrl('kein link')).toBeNull();
  });
});
