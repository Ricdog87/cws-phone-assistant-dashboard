import type { ViewLevel } from './demoUser';
import type { TabId } from './store';

export interface TabDefinition {
  id: TabId;
  label: string;
  /** Rollen, die den Reiter sehen. Einstellungen nur für die Führung. */
  roles: readonly ViewLevel[];
}

const LEADERSHIP: readonly ViewLevel[] = ['teamLead', 'director'];

/** Reiter in Anzeigereihenfolge. Den Kalender hat die Telefonassistenz in Salesforce offen. */
export const TABS: readonly TabDefinition[] = [
  { id: 'queue', label: 'Anrufliste', roles: ['assistant'] },
  { id: 'recalls', label: 'Wiedervorlagen', roles: ['assistant'] },
  { id: 'dashboard', label: 'Dashboard', roles: ['assistant', ...LEADERSHIP] },
  { id: 'market', label: 'Wettbewerb', roles: ['assistant', ...LEADERSHIP] },
  { id: 'map', label: 'Karte', roles: ['assistant', ...LEADERSHIP] },
  { id: 'scoring', label: 'Scoring', roles: LEADERSHIP },
  { id: 'data', label: 'Daten', roles: LEADERSHIP },
];

/** Reiter der Rolle in Anzeigereihenfolge */
export function tabsFor(level: ViewLevel): TabDefinition[] {
  return TABS.filter((tab) => tab.roles.includes(level));
}

/** Startreiter der Rolle */
export function homeTab(level: ViewLevel): TabId {
  return level === 'assistant' ? 'queue' : 'dashboard';
}

/** Gewählter Reiter, wenn die Rolle ihn sehen darf, sonst der Startreiter */
export function allowedTab(level: ViewLevel, tab: TabId): TabId {
  return tabsFor(level).some((item) => item.id === tab) ? tab : homeTab(level);
}
