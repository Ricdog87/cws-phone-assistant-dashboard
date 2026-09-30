import { create } from 'zustand';
import { MockProvider } from '@/data/providers/mockProvider';
import type { LeadProvider, LoadReport, ProviderId } from '@/data/providers/types';
import { MOCK_ROUTE } from '@/data/mockRoute';
import {
  DexieOutcomeRepository,
  InMemoryOutcomeRepository,
  type OutcomeRepository,
} from '@/data/repository';
import {
  CORRIDOR_MAX_KM,
  CORRIDOR_MIN_KM,
  DEFAULT_CORRIDOR_KM,
  DEFAULT_WEIGHTS,
  clampWeight,
} from '@/domain/scoring';
import type { CallOutcome, DimensionKey, Lead, Route, Weights } from '@/domain/types';

export type TabId = 'queue' | 'map' | 'dashboard' | 'scoring' | 'data';

export interface AppState {
  activeTab: TabId;
  sourceId: ProviderId;
  sourceLabel: string;
  leads: Lead[];
  loadReport: LoadReport | null;
  loadError: string | null;
  loading: boolean;
  route: Route;
  weights: Weights;
  corridorKm: number;
  controlEnabled: boolean;
  selectedLeadId: string | null;
  outcomes: CallOutcome[];

  setTab(tab: TabId): void;
  setWeight(key: DimensionKey, value: number): void;
  resetWeights(): void;
  setCorridorKm(km: number): void;
  setControlEnabled(enabled: boolean): void;
  selectLead(id: string | null): void;
  loadFromProvider(provider: LeadProvider, report?: () => LoadReport | null): Promise<void>;
  loadOutcomes(): Promise<void>;
  addOutcome(outcome: CallOutcome): Promise<void>;
  clearOutcomes(): Promise<void>;
}

export function createAppStore(repository: OutcomeRepository) {
  return create<AppState>()((set, get) => ({
    activeTab: 'queue',
    sourceId: 'mock',
    sourceLabel: 'Demo-Daten',
    leads: [],
    loadReport: null,
    loadError: null,
    loading: false,
    route: MOCK_ROUTE,
    weights: { ...DEFAULT_WEIGHTS },
    corridorKm: DEFAULT_CORRIDOR_KM,
    controlEnabled: true,
    selectedLeadId: null,
    outcomes: [],

    setTab: (activeTab) => set({ activeTab }),
    setWeight: (key, value) => set({ weights: { ...get().weights, [key]: clampWeight(value) } }),
    resetWeights: () => set({ weights: { ...DEFAULT_WEIGHTS } }),
    setCorridorKm: (km) =>
      set({ corridorKm: Math.max(CORRIDOR_MIN_KM, Math.min(CORRIDOR_MAX_KM, km)) }),
    setControlEnabled: (controlEnabled) => set({ controlEnabled }),
    selectLead: (selectedLeadId) => set({ selectedLeadId }),

    async loadFromProvider(provider, report) {
      set({ loading: true, loadError: null });
      try {
        const leads = await provider.load();
        set({
          leads,
          sourceId: provider.id,
          sourceLabel: provider.label,
          loadReport: report?.() ?? {
            total: leads.length,
            loaded: leads.length,
            rejectedMissingCoordinates: 0,
            rejectedOther: 0,
          },
          selectedLeadId: null,
          loading: false,
        });
      } catch (error) {
        set({
          loading: false,
          loadError: error instanceof Error ? error.message : 'Unbekannter Fehler beim Laden',
        });
      }
    },

    async loadOutcomes() {
      set({ outcomes: await repository.list() });
    },

    async addOutcome(outcome) {
      await repository.add(outcome);
      set({ outcomes: [...get().outcomes, outcome] });
    },

    async clearOutcomes() {
      await repository.clear();
      set({ outcomes: [] });
    },
  }));
}

function createRepository(): OutcomeRepository {
  return typeof indexedDB === 'undefined'
    ? new InMemoryOutcomeRepository()
    : new DexieOutcomeRepository();
}

export const useAppStore = createAppStore(createRepository());

/** Startdaten laden: Demo-Leads und gespeicherte Anrufergebnisse */
export async function bootstrap(): Promise<void> {
  const { loadFromProvider, loadOutcomes } = useAppStore.getState();
  await Promise.all([loadFromProvider(new MockProvider()), loadOutcomes()]);
}
