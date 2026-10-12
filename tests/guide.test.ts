import { describe, expect, it } from 'vitest';
import { GUIDE_STEPS, callGuide, fillScript, splitContactName } from '@/domain/guide';

const text = (parts: { text: string; gap: boolean }[]) =>
  parts.map((part) => (part.gap ? `[${part.text}]` : part.text)).join('');

describe('splitContactName', () => {
  it('setzt die Anrede in den Akkusativ und trennt den Nachnamen', () => {
    expect(splitContactName('Herr Ahlers')).toEqual({ salutation: 'Herrn', lastName: 'Ahlers' });
    expect(splitContactName('Frau Dr. Meyer')).toEqual({
      salutation: 'Frau',
      lastName: 'Dr. Meyer',
    });
    expect(splitContactName('Erika Muster')).toEqual({ salutation: '', lastName: 'Erika Muster' });
    expect(splitContactName('  ')).toBeNull();
    expect(splitContactName(null)).toBeNull();
  });
});

describe('fillScript', () => {
  it('füllt bekannte Werte und lässt fehlende als Lücke stehen', () => {
    const parts = fillScript('Am {tourtag} kommt {hunterName}.', { hunterName: 'Jonas Tiedemann' });
    expect(parts).toEqual([
      { text: 'Am ', gap: false },
      { text: 'Tag', gap: true },
      { text: ' kommt Jonas Tiedemann.', gap: false },
    ]);
  });

  it('lässt eine leere Anrede ohne doppelte Leerzeichen weg', () => {
    expect(
      text(fillScript('gern {anrede} {nachname} sprechen', { anrede: '', nachname: 'Muster' })),
    ).toBe('gern Muster sprechen');
  });
});

describe('callGuide', () => {
  const guide = callGuide({
    callerName: 'Nele Faber',
    contactName: 'Herr Ahlers',
    contactRole: 'Betriebsleitung',
    hunterName: 'Jonas Tiedemann',
  });

  it('liefert Bedarf, Termin, Abschluss und Zentrale ohne den Einstieg aus dem Leitfaden', () => {
    expect(guide.phases.map((phase) => phase.id)).toEqual([
      'switchboard',
      'need',
      'appointment',
      'close',
    ]);
    expect(GUIDE_STEPS.map((step) => step.title)).toEqual([
      'Bedarf',
      'Einwände',
      'Termin',
      'Abschluss',
      'Zentrale',
    ]);
  });

  it('spricht die Zentrale mit Name und Funktion an', () => {
    const switchboard = guide.phases.find((phase) => phase.id === 'switchboard');
    expect(text(switchboard?.lines[0]?.parts ?? [])).toBe(
      'Guten Tag, Nele Faber von CWS. Ich möchte gern Herrn Ahlers aus der Betriebsleitung sprechen.',
    );
    expect(switchboard?.lines).toHaveLength(2);
  });

  it('fragt ohne Ansprechpartner nur offen nach der zuständigen Person', () => {
    const open = callGuide({
      callerName: 'Nele Faber',
      contactName: null,
      contactRole: null,
      hunterName: null,
    });
    const lines = open.phases.find((phase) => phase.id === 'switchboard')?.lines ?? [];
    expect(lines.map((line) => line.id)).toEqual(['switchboard-open']);
  });

  it('setzt den Hunter ein und lässt Tag und Uhrzeiten als Lücke', () => {
    const appointment = guide.phases.find((phase) => phase.id === 'appointment');
    expect(text(appointment?.lines[0]?.parts ?? [])).toBe(
      'Unser Kollege Jonas Tiedemann ist am [Tag] ohnehin bei Ihnen in der Gegend. Passt Ihnen [Uhrzeit 1] oder eher [Uhrzeit 2]?',
    );
  });

  it('enthält die sechs Standard-Einwände mit Antwort', () => {
    expect(guide.objections).toHaveLength(6);
    expect(guide.objections[0]).toMatchObject({ trigger: 'Wir haben schon einen Anbieter' });
    expect(text(guide.objections[2]?.response ?? [])).toContain(
      'wenn Jonas Tiedemann ohnehin am [Tag]',
    );
  });
});
