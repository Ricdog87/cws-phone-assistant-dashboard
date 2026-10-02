import { describe, expect, it } from 'vitest';
import { renderScript } from '@/domain/scriptRender';

const filled = {
  assistenzName: 'Nele Faber',
  anrede: 'Frau',
  nachname: 'Janssen',
  funktion: 'Einkauf',
  firma: 'Nord Demo GmbH',
  ort: 'Emden',
  branche: 'Metallbau',
  hunterName: 'Kai Holm',
  tourtag: 'Dienstag',
  aufhaenger: 'Sie gerade Stellen besetzen',
};

describe('renderScript', () => {
  it('füllt alle Platzhalter', () => {
    expect(
      renderScript(
        '{assistenzName}|{anrede}|{nachname}|{funktion}|{firma}|{ort}|{branche}|{hunterName}|{tourtag}|{aufhaenger}',
        filled,
      ),
    ).toBe(
      'Nele Faber|Frau|Janssen|Einkauf|Nord Demo GmbH|Emden|Metallbau|Kai Holm|Dienstag|Sie gerade Stellen besetzen',
    );
  });

  it('ersetzt einen fehlenden Namen und lässt keine Klammer stehen', () => {
    const text = renderScript('Ich möchte gern Herrn {nachname} sprechen, {anrede} {nachname}.', {
      anrede: 'Herrn',
    });
    expect(text).toBe('Ich möchte gern die zuständige Person sprechen, die zuständige Person.');
    expect(text).not.toContain('{');
  });
});
