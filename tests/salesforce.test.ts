import { describe, expect, it } from 'vitest';
import {
  calendarUrl,
  newEventUrl,
  normalizeSalesforceUrl,
  recordUrl,
  salesforceObjectOf,
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

describe('newEventUrl', () => {
  it('füllt Betreff und Bezug zum Account vor und kodiert Sonderzeichen', () => {
    const url = newEventUrl(BASE, {
      subject: 'Neukundentermin: Bau, Fehn & Co.',
      recordId: ACCOUNT,
      description: 'Zeile 1\nZeile 2',
    });
    expect(url).toBe(
      `${BASE}/lightning/o/Event/new?defaultFieldValues=` +
        `Subject=Neukundentermin%3A%20Bau%2C%20Fehn%20%26%20Co.,WhatId=${ACCOUNT},` +
        'Description=Zeile%201%0AZeile%202',
    );
  });

  it('setzt Leads als Name (WhoId) und lässt Demo-IDs weg', () => {
    expect(newEventUrl(BASE, { subject: 'T', recordId: LEAD })).toBe(
      `${BASE}/lightning/o/Event/new?defaultFieldValues=Subject=T,WhoId=${LEAD}`,
    );
    expect(newEventUrl(BASE, { subject: 'T', recordId: 'DEMO-1' })).toBe(
      `${BASE}/lightning/o/Event/new?defaultFieldValues=Subject=T`,
    );
  });
});

describe('Kalender und Datensatz', () => {
  it('verlinkt Kalender und Datensatz', () => {
    expect(calendarUrl(BASE)).toBe(`${BASE}/lightning/o/Event/home`);
    expect(recordUrl(BASE, ACCOUNT)).toBe(`${BASE}/lightning/r/Account/${ACCOUNT}/view`);
    expect(recordUrl(BASE, 'DEMO-1')).toBeNull();
  });
});
