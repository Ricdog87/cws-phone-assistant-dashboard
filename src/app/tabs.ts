import type { ViewLevel } from './demoUser';
import type { TabId } from './store';

export interface TabDefinition {
  id: TabId;
  label: string;
  /** Rollen, die den Reiter sehen. Einstellungen nur für die Führung. */
  roles: readonly ViewLevel[];
}

/** Eintrag der Navigation, der keine Ansicht im Cockpit hat, sondern Salesforce öffnet */
export interface NavLinkDefinition {
  link: 'salesforceCalendar';
  label: string;
  roles: readonly ViewLevel[];
}

export type NavItem = TabDefinition | NavLinkDefinition;

const LEADERSHIP: readonly ViewLevel[] = ['teamLead', 'director'];

/** Navigation in Anzeigereihenfolge; „Termine“ öffnet den Salesforce-Kalender */
export const NAV: readonly NavItem[] = [
  { id: 'queue', label: 'Anrufliste', roles: ['assistant'] },
  { link: 'salesforceCalendar', label: 'Termine', roles: ['assistant'] },
  { id: 'recalls', label: 'Wiedervorlagen', roles: ['assistant'] },
  { id: 'dashboard', label: 'Dashboard', roles: ['assistant', ...LEADERSHIP] },
  { id: 'map', label: 'Karte', roles: ['assistant', ...LEADERSHIP] },
  { id: 'scoring', label: 'Scoring', roles: LEADERSHIP },
  { id: 'data', label: 'Daten', roles: LEADERSHIP },
];

export function isTab(item: NavItem): item is TabDefinition {
  return 'id' in item;
}

/** Navigation der Rolle in Anzeigereihenfolge */
export function navFor(level: ViewLevel): NavItem[] {
  return NAV.filter((item) => item.roles.includes(level));
}

/** Reiter mit eigener Ansicht im Cockpit */
export function tabsFor(level: ViewLevel): TabDefinition[] {
  return navFor(level).filter(isTab);
}

/** Startreiter der Rolle */
export function homeTab(level: ViewLevel): TabId {
  return level === 'assistant' ? 'queue' : 'dashboard';
}

/** Gewählter Reiter, wenn die Rolle ihn sehen darf, sonst der Startreiter */
export function allowedTab(level: ViewLevel, tab: TabId): TabId {
  return tabsFor(level).some((item) => item.id === tab) ? tab : homeTab(level);
}
