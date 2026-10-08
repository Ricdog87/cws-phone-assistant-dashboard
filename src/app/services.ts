import { FallbackBriefingGenerator } from '@/data/briefing/fallbackGenerator';
import { LlmBriefingGenerator } from '@/data/briefing/llmGenerator';
import { RuleBasedBriefingGenerator } from '@/data/briefing/ruleBasedGenerator';
import type { BriefingGenerator } from '@/data/briefing/types';
import {
  DexieContactRepository,
  InMemoryContactRepository,
  type ContactRepository,
} from '@/data/contactRepository';
import { AppDatabase } from '@/data/db';
import {
  DexieOpenCallRepository,
  InMemoryOpenCallRepository,
  type OpenCallRepository,
} from '@/data/openCallRepository';
import {
  DexieRecallRepository,
  InMemoryRecallRepository,
  type RecallRepository,
} from '@/data/recallRepository';
import {
  DexieSyncRepository,
  InMemorySyncRepository,
  type SyncRepository,
} from '@/data/syncRepository';
import { createGeocoder } from '@/data/geocoding';
import { DexieGeocodeCache, InMemoryGeocodeCache, type GeocodeCache } from '@/data/geocoding/cache';
import type { Geocoder } from '@/data/geocoding/types';
import {
  DexieColumnMappingRepository,
  InMemoryColumnMappingRepository,
  type ColumnMappingRepository,
} from '@/data/mappingRepository';
import {
  DexieOutcomeRepository,
  InMemoryOutcomeRepository,
  type OutcomeRepository,
} from '@/data/repository';

// Zentrale Stelle, an der Implementierungen ausgetauscht werden
const db = typeof indexedDB === 'undefined' ? null : new AppDatabase();

export const outcomeRepository: OutcomeRepository = db
  ? new DexieOutcomeRepository(db)
  : new InMemoryOutcomeRepository();

export const contactRepository: ContactRepository = db
  ? new DexieContactRepository(db)
  : new InMemoryContactRepository();

export const syncRepository: SyncRepository = db
  ? new DexieSyncRepository(db)
  : new InMemorySyncRepository();

export const openCallRepository: OpenCallRepository = db
  ? new DexieOpenCallRepository(db)
  : new InMemoryOpenCallRepository();

export const recallRepository: RecallRepository = db
  ? new DexieRecallRepository(db)
  : new InMemoryRecallRepository();

export const mappingRepository: ColumnMappingRepository = db
  ? new DexieColumnMappingRepository(db)
  : new InMemoryColumnMappingRepository();

export const geocodeCache: GeocodeCache = db
  ? new DexieGeocodeCache(db)
  : new InMemoryGeocodeCache();

export const geocoder: Geocoder = createGeocoder({
  kind: 'nominatim',
  cache: geocodeCache,
  nominatimEmail: import.meta.env.VITE_NOMINATIM_EMAIL || undefined,
});

export const ruleBasedBriefing = new RuleBasedBriefingGenerator();

/** Sprachmodell mit automatischem Rückfall auf die Regeln */
export const llmBriefing: BriefingGenerator = new FallbackBriefingGenerator(
  new LlmBriefingGenerator({ endpoint: import.meta.env.VITE_BRIEFING_ENDPOINT || undefined }),
  ruleBasedBriefing,
);

export type BriefingMode = 'rules' | 'llm';

export const DEFAULT_BRIEFING_MODE: BriefingMode =
  import.meta.env.VITE_BRIEFING_MODE === 'llm' ? 'llm' : 'rules';
