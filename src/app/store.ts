import { create } from 'zustand';
import {
  DEFAULT_BRIEFING_MODE,
  contactRepository,
  openCallRepository,
  outcomeRepository,
  recallRepository,
  syncRepository,
  type BriefingMode,
} from './services';
import { MockProvider } from '@/data/providers/mockProvider';
import {
  emptyReport,
  type LeadProvider,
  type LoadReport,
  type ProviderId,
} from '@/data/providers/types';
import { InMemoryContactRepository, type ContactRepository } from '@/data/contactRepository';
import { InMemoryOpenCallRepository, type OpenCallRepository } from '@/data/openCallRepository';
import { InMemoryRecallRepository, type RecallRepository } from '@/data/recallRepository';
import { InMemorySyncRepository, type SyncRepository } from '@/data/syncRepository';
import { needsSync, type SalesforceTaskInput, type SyncItem } from '@/domain/salesforceSync';
import { postTask, type TaskSender } from './salesforceClient';
import type { OutcomeRepository } from '@/data/repository';
import type { AgentGoals } from '@/domain/agentGoals';
import { DAILY_CALL_GOAL, WEEKLY_APPOINTMENT_GOAL } from '@/domain/goals';
import { DEFAULT_WEIGHTS, DIMENSION_KEYS, clampWeight } from '@/domain/scoring';
import type {
  CallOutcome,
  ContactUpdate,
  DimensionKey,
  Lead,
  OpenCall,
  Recall,
  Weights,
} from '@/domain/types';
import { defaultAssignments } from '@/data/demoAssignments';
import { LIVE_ASSISTANT_ID } from '@/data/demoTeam';
import { loadAssignments, saveAssignments, type Assignments } from './assignments';
import { DEMO_USER, type ViewLevel } from './demoUser';
import { allowedTab, homeTab } from './tabs';
import { loadSession, saveSession } from './session';

export type TabId = 'queue' | 'recalls' | 'map' | 'dashboard' | 'scoring' | 'data';

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
  /** Wiedervorlagen mit Fälligkeit */
  recalls: Recall[];
  /** Gespräche mit gespeichertem Protokoll, denen noch das Ergebnis fehlt */
  openCalls: OpenCall[];
  /** Postausgang nach Salesforce mit Status je Gespräch und Wiedervorlage */
  syncItems: SyncItem[];
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
  /** Löscht Anrufergebnisse, Kontakte, Wiedervorlagen, offene Gespräche und den Postausgang */
  clearOutcomes(): Promise<void>;
  loadContacts(): Promise<void>;
  addContact(contact: ContactUpdate): Promise<void>;
  loadRecalls(): Promise<void>;
  /** Legt eine Wiedervorlage an oder ersetzt sie mit derselben ID */
  addRecall(recall: Recall): Promise<void>;
  loadOpenCalls(): Promise<void>;
  /** Legt ein offenes Gespräch an oder ersetzt es mit derselben ID */
  saveOpenCall(call: OpenCall): Promise<void>;
  /** Schließt ein offenes Gespräch, sobald sein Ergebnis gebucht ist */
  removeOpenCall(id: string): Promise<void>;
  loadSyncItems(): Promise<void>;
  /**
   * Stellt eine Aufgabe in den Postausgang; id ist die ID des Gesprächs oder der Wiedervorlage.
   * Ist sie schon übertragen, aktualisiert die nächste Übertragung dieselbe Aufgabe.
   */
  enqueueSync(id: string, task: SalesforceTaskInput): Promise<void>;
  /** Überträgt alles Offene; mit Demo-Daten wird die Übertragung nur simuliert */
  flushSync(): Promise<void>;
}

export function createAppStore(
  repository: OutcomeRepository,
  contactStore: ContactRepository = new InMemoryContactRepository(),
  recallStore: RecallRepository = new InMemoryRecallRepository(),
  syncStore: SyncRepository = new InMemorySyncRepository(),
  sendTask: TaskSender = postTask,
  openCallStore: OpenCallRepository = new InMemoryOpenCallRepository(),
) {
  // Ein Durchlauf zur Zeit, damit keine Aufgabe doppelt in Salesforce landet
  let flushing: Promise<void> | null = null;
  // Anmeldung dieses Browser-Tabs wiederherstellen, etwa nach dem Neuladen
  const restoredLevel = loadSession();
  const initialAssignments = loadAssignments() ?? defaultAssignments();
  return create<AppState>()((set, get) => ({
    activeTab: restoredLevel ? homeTab(restoredLevel) : 'dashboard',
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
    recalls: [],
    openCalls: [],
    syncItems: [],
    viewLevel: restoredLevel ?? 'teamLead',
    signedIn: restoredLevel !== null,

    setTab: (tab) => set({ activeTab: allowedTab(get().viewLevel, tab) }),
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
        activeTab: homeTab(viewLevel),
      }),
    signIn: (viewLevel) => {
      saveSession(viewLevel);
      set({
        viewLevel,
        signedIn: true,
        selectedLeadId: null,
        activeTab: homeTab(viewLevel),
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
      await Promise.all([
        repository.clear(),
        contactStore.clear(),
        recallStore.clear(),
        syncStore.clear(),
        openCallStore.clear(),
      ]);
      set({ outcomes: [], contacts: [], recalls: [], openCalls: [], syncItems: [] });
    },

    async loadContacts() {
      set({ contacts: await contactStore.list() });
    },

    async addContact(contact) {
      await contactStore.add(contact);
      set({ contacts: [...get().contacts.filter((c) => c.id !== contact.id), contact] });
    },

    async loadRecalls() {
      set({ recalls: await recallStore.list() });
    },

    async addRecall(recall) {
      await recallStore.add(recall);
      set({ recalls: [...get().recalls.filter((r) => r.id !== recall.id), recall] });
    },

    async loadOpenCalls() {
      set({ openCalls: await openCallStore.list() });
    },

    async saveOpenCall(call) {
      await openCallStore.put(call);
      set({ openCalls: [...get().openCalls.filter((c) => c.id !== call.id), call] });
    },

    async removeOpenCall(id) {
      await openCallStore.remove(id);
      set({ openCalls: get().openCalls.filter((c) => c.id !== id) });
    },

    async loadSyncItems() {
      set({ syncItems: await syncStore.list() });
    },

    async enqueueSync(id, task) {
      const existing = get().syncItems.find((entry) => entry.id === id);
      const item: SyncItem = {
        id,
        task,
        status: 'pending',
        attempts: 0,
        // Schon übertragen: dieselbe Aufgabe aktualisieren statt eine zweite anzulegen
        salesforceId: existing?.salesforceId ?? null,
        updatedAt: new Date().toISOString(),
      };
      await syncStore.put(item);
      set({ syncItems: [...get().syncItems.filter((entry) => entry.id !== id), item] });
    },

    async flushSync() {
      if (flushing) return flushing;
      /**
       * Ergebnis einer Übertragung sichern. Wurde der Eintrag währenddessen geändert, bleibt
       * er offen und behält nur die neue Salesforce-ID; der nächste Durchlauf schickt ihn nach.
       */
      const settle = async (sent: SyncItem, result: Partial<SyncItem>) => {
        const current = get().syncItems.find((entry) => entry.id === sent.id);
        // Inzwischen gelöscht, etwa über „Ergebnisse löschen“
        if (!current) return;
        const item: SyncItem =
          current.task !== sent.task
            ? { ...current, salesforceId: result.salesforceId ?? current.salesforceId }
            : { ...sent, ...result, updatedAt: new Date().toISOString() };
        await syncStore.put(item);
        set({ syncItems: get().syncItems.map((entry) => (entry.id === item.id ? item : entry)) });
      };
      flushing = (async () => {
        let batch = get().syncItems.filter(needsSync);
        while (batch.length > 0) {
          for (const item of batch) {
            // Demo-Leads haben keine Salesforce-IDs, die Übertragung wird nur simuliert
            if (get().sourceId === 'mock') {
              await settle(item, { status: 'demo' });
              continue;
            }
            const result = await sendTask(item.task, item.salesforceId);
            await settle(item, {
              status: result.status,
              salesforceId: result.salesforceId ?? item.salesforceId,
              attempts: item.attempts + 1,
            });
          }
          // Während der Übertragung geändert: gleich hinterher
          batch = get().syncItems.filter((entry) => entry.status === 'pending');
        }
      })().finally(() => {
        flushing = null;
        // Kurz vor Schluss eingestellt: nicht bis zur nächsten Aktion liegen lassen
        if (get().syncItems.some((entry) => entry.status === 'pending')) void get().flushSync();
      });
      return flushing;
    },
  }));
}

export const useAppStore = createAppStore(
  outcomeRepository,
  contactRepository,
  recallRepository,
  syncRepository,
  postTask,
  openCallRepository,
);

/** Startdaten laden: Demo-Leads, Ergebnisse, Kontakte, Wiedervorlagen, Gespräche, Postausgang */
export async function bootstrap(): Promise<void> {
  const state = useAppStore.getState();
  await Promise.all([
    state.loadFromProvider(new MockProvider()),
    state.loadOutcomes(),
    state.loadContacts(),
    state.loadRecalls(),
    state.loadOpenCalls(),
    state.loadSyncItems(),
  ]);
  // Was beim letzten Mal nicht übertragen wurde, jetzt nachholen
  await state.flushSync();
}
