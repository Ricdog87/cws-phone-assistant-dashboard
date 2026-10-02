import { describe, expect, it } from 'vitest';
import { selectGuideHook, withinReferenceRadius, type GuideHookInput } from '@/domain/hook';

const quiet: GuideHookInput = {
  openPositions: 0,
  openPositionsAgeDays: null,
  siteExpansion: false,
  siteExpansionAgeDays: null,
  managementChange: false,
  managementChangeAgeDays: null,
  hunterNearby: false,
  nearbySameIndustry: 0,
  industry: 'Handel',
};

describe('selectGuideHook', () => {
  it('nimmt die erste frische Stufe und überspringt veraltete Signale', () => {
    expect(
      selectGuideHook({ ...quiet, openPositions: 3, openPositionsAgeDays: 59, hunterNearby: true })
        .kind,
    ).toBe('positions');
    expect(
      selectGuideHook({
        ...quiet,
        openPositions: 3,
        openPositionsAgeDays: 60,
        siteExpansion: true,
        siteExpansionAgeDays: 10,
      }).kind,
    ).toBe('expansion');
    expect(
      selectGuideHook({ ...quiet, managementChange: true, managementChangeAgeDays: 1 }).kind,
    ).toBe('management');
    expect(selectGuideHook({ ...quiet, hunterNearby: true }).kind).toBe('hunter');
    expect(selectGuideHook({ ...quiet, nearbySameIndustry: 2 }).kind).toBe('reference');
    expect(selectGuideHook({ ...quiet, industry: 'Logistik' }).kind).toBe('industry');
  });

  it('nennt bei der Referenz keine Firma', () => {
    const hook = selectGuideHook({ ...quiet, nearbySameIndustry: 2, industry: 'Logistik' });
    expect(hook.text).toContain('{branche}');
    expect(hook.text).not.toMatch(/GmbH|Demo/);
  });

  it('zählt 5 km als Referenzradius und 5,1 km nicht', () => {
    expect(withinReferenceRadius(5)).toBe(true);
    expect(withinReferenceRadius(5.1)).toBe(false);
  });
});
