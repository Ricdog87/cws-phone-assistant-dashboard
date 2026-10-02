import { describe, expect, it } from 'vitest';
import { AppDatabase } from '@/data/db';
import {
  DexieColumnMappingRepository,
  InMemoryColumnMappingRepository,
  headerFingerprint,
} from '@/data/mappingRepository';

describe('headerFingerprint', () => {
  it('ist unabhängig von Reihenfolge und Groß- und Kleinschreibung', () => {
    expect(headerFingerprint(['Ort', 'Firma'])).toBe(headerFingerprint(['firma ', 'ORT']));
  });
});

describe.each([
  ['Dexie', () => new DexieColumnMappingRepository(new AppDatabase(`map-${Math.random()}`))],
  ['InMemory', () => new InMemoryColumnMappingRepository()],
])('%s-Zuordnungsspeicher', (_name, create) => {
  it('schlägt die Zuordnung derselben Kopfzeile vor', async () => {
    const repo = create();
    await repo.save(['Kunde', 'Stadt'], { name: 'Kunde', city: 'Stadt' });
    expect(await repo.find(['Stadt', 'Kunde'])).toEqual({ name: 'Kunde', city: 'Stadt' });
  });

  it('nutzt sonst die letzte Zuordnung, soweit die Spalten vorhanden sind', async () => {
    const repo = create();
    await repo.save(['Kunde', 'Stadt'], { name: 'Kunde', city: 'Stadt' });
    expect(await repo.find(['Kunde', 'PLZ'])).toEqual({ name: 'Kunde' });
    expect(await repo.find(['Etwas', 'Anderes'])).toBeNull();
  });

  it('liefert ohne gespeicherte Zuordnung null', async () => {
    expect(await create().find(['A'])).toBeNull();
  });
});

describe('Persistenz der Zuordnung', () => {
  it('überlebt eine neue Instanz', async () => {
    const name = `map-persist-${Math.random()}`;
    await new DexieColumnMappingRepository(new AppDatabase(name)).save(['Kunde'], {
      name: 'Kunde',
    });
    expect(await new DexieColumnMappingRepository(new AppDatabase(name)).find(['Kunde'])).toEqual({
      name: 'Kunde',
    });
  });
});
