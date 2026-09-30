import { describe, expect, it } from 'vitest';
import { DexieOutcomeRepository, InMemoryOutcomeRepository } from '@/data/repository';
import { makeOutcome } from './fixtures';

describe.each([
  ['Dexie', () => new DexieOutcomeRepository(`test-${Math.random()}`)],
  ['InMemory', () => new InMemoryOutcomeRepository()],
])('%s-Repository', (_name, create) => {
  it('speichert, listet chronologisch und leert', async () => {
    const repo = create();
    await repo.add(makeOutcome({ id: 'b', recordedAt: '2026-09-02T00:00:00Z' }));
    await repo.add(makeOutcome({ id: 'a', recordedAt: '2026-09-01T00:00:00Z' }));
    expect((await repo.list()).map((o) => o.id)).toEqual(['a', 'b']);
    await repo.clear();
    expect(await repo.list()).toEqual([]);
  });
});

describe('Dexie-Persistenz', () => {
  it('überlebt eine neue Instanz auf derselben Datenbank', async () => {
    const name = `persist-${Math.random()}`;
    await new DexieOutcomeRepository(name).add(makeOutcome({ id: 'x' }));
    const reloaded = await new DexieOutcomeRepository(name).list();
    expect(reloaded.map((o) => o.id)).toEqual(['x']);
  });
});
