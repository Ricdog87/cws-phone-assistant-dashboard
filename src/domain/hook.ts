import { LEITFADEN, type GuideHookKind } from '@/content/leitfaden';
import { INDUSTRY_MODULES } from '@/content/industryModules';
import { REFERENCE_MIN_COUNT, SIGNAL_FRESH_DAYS } from './qualificationConfig';
import { REFERENCE_RADIUS_KM } from './routingConfig';

export interface GuideHookInput {
  openPositions: number;
  openPositionsAgeDays: number | null;
  siteExpansion: boolean;
  siteExpansionAgeDays: number | null;
  managementChange: boolean;
  managementChangeAgeDays: number | null;
  /** Hunter hat an diesem Tourtag eine Tour. Der Radius zählt nur für die Referenz. */
  hunterNearby: boolean;
  /** Bestandskunden derselben Branche innerhalb von REFERENCE_RADIUS_KM. */
  nearbySameIndustry: number;
  industry: string;
}

export interface GuideHook {
  kind: GuideHookKind;
  text: string;
}

export function withinReferenceRadius(distanceKm: number): boolean {
  return distanceKm <= REFERENCE_RADIUS_KM;
}

function fresh(ageDays: number | null): boolean {
  return ageDays !== null && ageDays < SIGNAL_FRESH_DAYS;
}

function industryHook(industry: string): string {
  const module = INDUSTRY_MODULES.modules.find((item) =>
    (item.industries as readonly string[]).includes(industry),
  );
  return module?.hook ?? INDUSTRY_MODULES.other.hook;
}

/** Erster vorhandener Aufhänger. Kundennamen stehen nicht im Text. */
export function selectGuideHook(input: GuideHookInput): GuideHook {
  if (input.openPositions > 0 && fresh(input.openPositionsAgeDays)) {
    return { kind: 'positions', text: LEITFADEN.hooks.positions };
  }
  if (input.siteExpansion && fresh(input.siteExpansionAgeDays)) {
    return { kind: 'expansion', text: LEITFADEN.hooks.expansion };
  }
  if (input.managementChange && fresh(input.managementChangeAgeDays)) {
    return { kind: 'management', text: LEITFADEN.hooks.management };
  }
  if (input.hunterNearby) {
    return { kind: 'hunter', text: LEITFADEN.hooks.hunter };
  }
  if (input.nearbySameIndustry >= REFERENCE_MIN_COUNT) {
    return { kind: 'reference', text: LEITFADEN.hooks.reference };
  }
  return { kind: 'industry', text: industryHook(input.industry) };
}
