import { describe, expect, it } from 'vitest';
import {
  calendarUrl,
  newTaskUrl,
  normalizeSalesforceUrl,
  recordUrl,
  salesforceObjectOf,
  tasksUrl,
} from '@/domain/salesforce';

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

describe('Kalender und Datensatz', () => {
  it('verlinkt Kalender und Datensatz', () => {
    expect(calendarUrl(BASE, '2026-10-08')).toBe(
      `${BASE}/lightning/o/Event/home?startDate=2026-10-08&view=week`,
    );
    expect(recordUrl(BASE, ACCOUNT)).toBe(`${BASE}/lightning/r/Account/${ACCOUNT}/view`);
    expect(recordUrl(BASE, 'DEMO-1')).toBeNull();
  });
});

describe('newTaskUrl', () => {
  it('legt die Wiedervorlage als Aufgabe mit Fälligkeit und Lead an', () => {
    const url = newTaskUrl(BASE, {
      subject: 'Wiedervorlage: Bau Fehn',
      recordId: LEAD,
      dueDate: '2026-10-12',
      description: 'Grund: Rückruf vereinbart',
    });
    expect(url).toBe(
      `${BASE}/lightning/o/Task/new?defaultFieldValues=` +
        `Subject=Wiedervorlage%3A%20Bau%20Fehn,WhoId=${LEAD},ActivityDate=2026-10-12,` +
        `Description=Grund%3A%20R%C3%BCckruf%20vereinbart`,
    );
    expect(tasksUrl(BASE)).toBe(`${BASE}/lightning/o/Task/home`);
  });

  it('lässt den Bezug bei Demo-IDs weg', () => {
    expect(
      newTaskUrl(BASE, { subject: 'Wiedervorlage: X', recordId: 'DEMO-1', dueDate: '2026-10-12' }),
    ).toBe(
      `${BASE}/lightning/o/Task/new?defaultFieldValues=Subject=Wiedervorlage%3A%20X,ActivityDate=2026-10-12`,
    );
  });
});
