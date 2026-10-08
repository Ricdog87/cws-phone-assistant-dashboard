import type { OpenCall } from './types';

/** Offenes Gespräch zum Lead; gäbe es mehrere, das zuletzt gespeicherte */
export function openCallFor(calls: readonly OpenCall[], leadId: string): OpenCall | undefined {
  let latest: OpenCall | undefined;
  for (const call of calls) {
    if (call.leadId === leadId && (!latest || call.savedAt >= latest.savedAt)) latest = call;
  }
  return latest;
}
