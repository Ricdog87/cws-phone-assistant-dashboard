import type { TabId } from './store';

export const TABS: { id: TabId; label: string }[] = [
  { id: 'queue', label: 'Anrufliste' },
  { id: 'map', label: 'Karte' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'data', label: 'Daten' },
];
