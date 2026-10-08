import type { Lead } from '@/domain/types';
import { DEMO_HUNTERS, type TerritoryRegionId } from './hunters';
import { stateAt } from './territory';

/** Stabiler Hash, damit dieselbe Firma immer denselben Hunter bekommt */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shiftDays(today: string, days: number): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Ordnet die Demo-Leads einem fiktiven Hunter ihrer Region zu und vergibt eine
 * letzte Aktivität. Rund ein Fünftel hatte noch keine Aktivität. Nur für Demo-Daten.
 */
export function withDemoOwnership(leads: readonly Lead[], today: string): Lead[] {
  return leads.map((lead) => {
    const state = lead.lat !== null && lead.lng !== null ? stateAt(lead.lat, lead.lng) : null;
    const regionId: TerritoryRegionId = state === 'Nordrhein-Westfalen' ? 'nrw' : 'nord';
    const hunters = DEMO_HUNTERS.filter((hunter) => hunter.regionId === regionId);
    const h = hash(lead.id);
    const owner = hunters[h % hunters.length]?.name ?? null;
    const lastActivity = h % 100 < 22 ? null : shiftDays(today, 3 + (Math.floor(h / 100) % 420));
    return { ...lead, owner, lastActivity };
  });
}
