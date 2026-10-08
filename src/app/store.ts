import { create } from 'zustand';
import {
  DEFAULT_BRIEFING_MODE,
  appointmentRepository,
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
import {
  InMemoryAppointmentRepository,
  type AppointmentRepository,
} from '@/data/appointmentRepository';
import { InMemoryContactRepository, type ContactRepository } from '@/data/contactRepository';
import type { OutcomeRepository } from '@/data/repository';
import type { AgentGoals } from '@/domain/agentGoals';
import { DAILY_CALL_GOAL, WEEKLY_APPOINTMENT_GOAL } from '@/domain/goals';
import { DEFAULT_WEIGHTS, DIMENSION_KEYS, clampWeight } from '@/domain/scoring';
import type {
  Appointment,
  CallOutcome,
  ContactUpdate,
  DimensionKey,
  Lead,
  Weights,
} from '@/domain/types';
import { defaultAssignments } from '@/data/demoAssignments';
import { LIVE_ASSISTANT_ID } from '@/data/demoTeam';
import { loadAssignments, saveAssignments, type Assignments } from './assignments';
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
  /** Accountinhaber, dessen Potenzialliste angerufen wird; null zeigt alle Hunter */
  ownerFilter: string | null;
  /** Zuordnung Telefonassistenz zu Hunter (Sales Rep), gesetzt über die Auswahlfelder */
  assignments: Assignments;
  weights: Weights;
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
  /** Vereinbarte Termine mit Datum, Hunter und Ansprechpartner */
  appointments: Appointment[];
  viewLevel: ViewLevel;
  /** Simulierte Anmeldung per Single Sign-on */
  signedIn: boolean;

  setTab(tab: TabId): void;
  setOwnerFilter(owner: string | null): void;
  /** Ordnet eine Telefonassistenz einem Hunter zu; null hebt die Zuordnung auf */
  setAssignment(memberId: string, hunter: string | null): void;
  setViewLevel(level: ViewLevel): void;
  signIn(level: ViewLevel): void;
  signOut(): void;
  setWeight(key: DimensionKey, value: number): void;
  resetWeights(): void;
  /** Setzt alle Gewichte auf einmal, etwa nach bestätigtem Kalibrierungsvorschlag */
  setWeights(weights: Weights): void;
  setControlEnabled(enabled: boolean): void;
  setBriefingMode(mode: BriefingMode): void;
  setAgentName(name: string): void;
  setAgentGoals(goals: AgentGoals): void;
  selectLead(id: string | null): void;
  loadFromProvider(provider: LeadProvider, report?: () => LoadReport | null): Promise<void>;
  loadOutcomes(): Promise<void>;
  addOutcome(outcome: CallOutcome): Promise<void>;
  /** Löscht Anrufergebnisse, erfasste Kontakte und Termine */
  clearOutcomes(): Promise<void>;
  loadContacts(): Promise<void>;
  addContact(contact: ContactUpdate): Promise<void>;
  loadAppointments(): Promise<void>;
  addAppointment(appointment: Appointment): Promise<void>;
}

export function createAppStore(
  repository: OutcomeRepository,
  contactStore: ContactRepository = new InMemoryContactRepository(),
  appointmentStore: AppointmentRepository = new InMemoryAppointmentRepository(),
) {
  // Anmeldung dieses Browser-Tabs wiederherstellen, etwa nach dem Neuladen
  const restoredLevel = loadSession();
  const initialAssignments = loadAssignments() ?? defaultAssignments();
  return create<AppState>()((set, get) => ({
    activeTab: restoredLevel === 'assistant' ? 'queue' : 'dashboard',
    sourceId: 'mock',
    sourceLabel: 'Demo-Daten',
    leads: [],
    loadReport: null,
    loadError: null,
    loading: false,
    // Die angemeldete Telefonassistenz startet mit der Leadliste ihres Hunters
    ownerFilter:
      restoredLevel === 'assistant' ? (initialAssignments[LIVE_ASSISTANT_ID] ?? null) : null,
    assignments: initialAssignments,
    weights: { ...DEFAULT_WEIGHTS },
    controlEnabled: true,
    briefingMode: DEFAULT_BRIEFING_MODE,
    // Eine Persona und eine Zielquelle für Live-Maske, Teamleitung und Vertriebsleitung
    agentName: DEMO_USER.fullName,
    agentGoals: { dailyCalls: DAILY_CALL_GOAL, weeklyAppointments: WEEKLY_APPOINTMENT_GOAL },
    selectedLeadId: null,
    outcomes: [],
    contacts: [],
    appointments: [],
    viewLevel: restoredLevel ?? 'teamLead',
    signedIn: restoredLevel !== null,

    setTab: (activeTab) => set({ activeTab }),
    setOwnerFilter: (ownerFilter) => set({ ownerFilter, selectedLeadId: null }),
    setAssignment: (memberId, hunter) => {
      const others = Object.entries(get().assignments).filter(([id]) => id !== memberId);
      const next: Assignments = Object.fromEntries(
        hunter ? [...others, [memberId, hunter]] : others,
      );
      saveAssignments(next);
      const live = memberId === LIVE_ASSISTANT_ID && get().viewLevel === 'assistant';
      set(
        live
          ? { assignments: next, ownerFilter: hunter, selectedLeadId: null }
          : { assignments: next },
      );
    },
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
        ownerFilter:
          viewLevel === 'assistant' ? (get().assignments[LIVE_ASSISTANT_ID] ?? null) : null,
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
        weights: Object.fromEntries(
          DIMENSION_KEYS.map((key) => [key, clampWeight(weights[key])]),
        ) as Weights,
      }),
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
      await Promise.all([repository.clear(), contactStore.clear(), appointmentStore.clear()]);
      set({ outcomes: [], contacts: [], appointments: [] });
    },

    async loadContacts() {
      set({ contacts: await contactStore.list() });
    },

    async addContact(contact) {
      await contactStore.add(contact);
      set({ contacts: [...get().contacts.filter((c) => c.id !== contact.id), contact] });
    },

    async loadAppointments() {
      set({ appointments: await appointmentStore.list() });
    },

    async addAppointment(appointment) {
      await appointmentStore.add(appointment);
      set({
        appointments: [...get().appointments.filter((a) => a.id !== appointment.id), appointment],
      });
    },
  }));
}

export const useAppStore = createAppStore(
  outcomeRepository,
  contactRepository,
  appointmentRepository,
);

/** Startdaten laden: Demo-Leads, gespeicherte Anrufergebnisse, Kontakte und Termine */
export async function bootstrap(): Promise<void> {
  const { loadFromProvider, loadOutcomes, loadContacts, loadAppointments } = useAppStore.getState();
  await Promise.all([
    loadFromProvider(new MockProvider()),
    loadOutcomes(),
    loadContacts(),
    loadAppointments(),
  ]);
}
