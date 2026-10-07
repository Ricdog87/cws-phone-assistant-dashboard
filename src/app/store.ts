import { create } from 'zustand';
import {
  DEFAULT_BRIEFING_MODE,
  contactRepository,
  outcomeRepository,
  type BriefingMode,
} from './services';
import { MockProvider } from '@/data/providers/mockProvider';
import {
  emptyReport,
  type LeadProvider,
  type LoadReport,
  type ProviderId,
} from '@/data/providers/types';
import { DEFAULT_TOUR_ID, tourById } from '@/data/tours';
import { InMemoryContactRepository, type ContactRepository } from '@/data/contactRepository';
import type { OutcomeRepository } from '@/data/repository';
import type { AgentGoals } from '@/domain/agentGoals';
import { DAILY_CALL_GOAL, WEEKLY_APPOINTMENT_GOAL } from '@/domain/goals';
import {
  CORRIDOR_MAX_KM,
  CORRIDOR_MIN_KM,
  DEFAULT_CORRIDOR_KM,
  DEFAULT_WEIGHTS,
  clampWeight,
} from '@/domain/scoring';
import type {
  CallOutcome,
  ContactUpdate,
  DimensionKey,
  Lead,
  Route,
  Weights,
} from '@/domain/types';
import { DEMO_USER, type ViewLevel } from './demoUser';
import { loadSession, saveSession } from './session';

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
  briefingMode: BriefingMode;
  /** Anzeigename der angemeldeten Telefonassistenz */
  agentName: string;
  /** Tages- und Wochenziele der Live-Maske */
  agentGoals: AgentGoals;
  selectedLeadId: string | null;
  outcomes: CallOutcome[];
  /** Im Gespräch erfasste Kontakte, Rückweg nach Salesforce per CSV */
  contacts: ContactUpdate[];
  viewLevel: ViewLevel;
  /** Simulierte Anmeldung per Single Sign-on */
  signedIn: boolean;

  setTab(tab: TabId): void;
  /** Aktive Servicetour, Warteschlange und Korridor folgen ihr */
  setTour(tourId: string): void;
  setViewLevel(level: ViewLevel): void;
  signIn(level: ViewLevel): void;
  signOut(): void;
  setWeight(key: DimensionKey, value: number): void;
  resetWeights(): void;
  /** Setzt alle Gewichte auf einmal, etwa nach bestätigtem Kalibrierungsvorschlag */
  setWeights(weights: Weights): void;
  setCorridorKm(km: number): void;
  setControlEnabled(enabled: boolean): void;
  setBriefingMode(mode: BriefingMode): void;
  setAgentName(name: string): void;
  setAgentGoals(goals: AgentGoals): void;
  selectLead(id: string | null): void;
  loadFromProvider(provider: LeadProvider, report?: () => LoadReport | null): Promise<void>;
  loadOutcomes(): Promise<void>;
  addOutcome(outcome: CallOutcome): Promise<void>;
  /** Löscht Anrufergebnisse und erfasste Kontakte */
  clearOutcomes(): Promise<void>;
  loadContacts(): Promise<void>;
  addContact(contact: ContactUpdate): Promise<void>;
}

export function createAppStore(
  repository: OutcomeRepository,
  contactStore: ContactRepository = new InMemoryContactRepository(),
) {
  // Anmeldung dieses Browser-Tabs wiederherstellen, etwa nach dem Neuladen
  const restoredLevel = loadSession();
  return create<AppState>()((set, get) => ({
    activeTab: restoredLevel === 'assistant' ? 'queue' : 'dashboard',
    sourceId: 'mock',
    sourceLabel: 'Demo-Daten',
    leads: [],
    loadReport: null,
    loadError: null,
    loading: false,
    route: tourById(DEFAULT_TOUR_ID),
    weights: { ...DEFAULT_WEIGHTS },
    corridorKm: DEFAULT_CORRIDOR_KM,
    controlEnabled: true,
    briefingMode: DEFAULT_BRIEFING_MODE,
    // Eine Persona und eine Zielquelle für Live-Maske, Teamleitung und Vertriebsleitung
    agentName: DEMO_USER.fullName,
    agentGoals: { dailyCalls: DAILY_CALL_GOAL, weeklyAppointments: WEEKLY_APPOINTMENT_GOAL },
    selectedLeadId: null,
    outcomes: [],
    contacts: [],
    viewLevel: restoredLevel ?? 'teamLead',
    signedIn: restoredLevel !== null,

    setTab: (activeTab) => set({ activeTab }),
    setTour: (tourId) => set({ route: tourById(tourId), selectedLeadId: null }),
    setViewLevel: (viewLevel) =>
      set({
        viewLevel,
        activeTab: viewLevel === 'assistant' ? 'queue' : 'dashboard',
      }),
    signIn: (viewLevel) => {
      saveSession(viewLevel);
      set({
        viewLevel,
        signedIn: true,
        selectedLeadId: null,
        activeTab: viewLevel === 'assistant' ? 'queue' : 'dashboard',
      });
    },
    signOut: () => {
      saveSession(null);
      set({ signedIn: false, selectedLeadId: null });
    },
    setWeight: (key, value) => set({ weights: { ...get().weights, [key]: clampWeight(value) } }),
    resetWeights: () => set({ weights: { ...DEFAULT_WEIGHTS } }),
    setWeights: (weights) =>
      set({
        weights: {
          fit: clampWeight(weights.fit),
          proximity: clampWeight(weights.proximity),
          potential: clampWeight(weights.potential),
          reachability: clampWeight(weights.reachability),
        },
      }),
    setCorridorKm: (km) =>
      set({ corridorKm: Math.max(CORRIDOR_MIN_KM, Math.min(CORRIDOR_MAX_KM, km)) }),
    setControlEnabled: (controlEnabled) => set({ controlEnabled }),
    setBriefingMode: (briefingMode) => set({ briefingMode }),
    setAgentName: (agentName) => set({ agentName }),
    setAgentGoals: (agentGoals) =>
      set({
        agentGoals: {
          dailyCalls: Math.max(1, Math.round(agentGoals.dailyCalls)),
          weeklyAppointments: Math.max(1, Math.round(agentGoals.weeklyAppointments)),
        },
      }),
    selectLead: (selectedLeadId) => set({ selectedLeadId }),

    async loadFromProvider(provider, report) {
      set({ loading: true, loadError: null });
      try {
        const leads = await provider.load();
        set({
          leads,
          sourceId: provider.id,
          sourceLabel: provider.label,
          loadReport: report?.() ?? emptyReport(leads.length),
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
      await Promise.all([repository.clear(), contactStore.clear()]);
      set({ outcomes: [], contacts: [] });
    },

    async loadContacts() {
      set({ contacts: await contactStore.list() });
    },

    async addContact(contact) {
      await contactStore.add(contact);
      set({ contacts: [...get().contacts.filter((c) => c.id !== contact.id), contact] });
    },
  }));
}

export const useAppStore = createAppStore(outcomeRepository, contactRepository);

/** Startdaten laden: Demo-Leads, gespeicherte Anrufergebnisse und Kontakte */
export async function bootstrap(): Promise<void> {
  const { loadFromProvider, loadOutcomes, loadContacts } = useAppStore.getState();
  await Promise.all([loadFromProvider(new MockProvider()), loadOutcomes(), loadContacts()]);
}
