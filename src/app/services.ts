import { AppDatabase } from '@/data/db';
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
