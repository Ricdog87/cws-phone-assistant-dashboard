import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/app/store';
import { calibrate } from '@/domain/calibration';
import { DEFAULT_WEIGHTS } from '@/domain/scoring';
import { CalibrationPanel } from '@/features/scoring/CalibrationPanel';
import { simulate } from './simulate';

describe('CalibrationPanel', () => {
  beforeEach(() => {
    act(() => useAppStore.setState({ weights: { ...DEFAULT_WEIGHTS }, outcomes: [] }));
  });

  it('zeigt unter 300 Anrufen nur die Quoten und den Fortschritt', () => {
    act(() => useAppStore.setState({ outcomes: simulate(120) }));
    render(<CalibrationPanel />);
    expect(screen.getByText(/Es fehlen noch 180/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vorschlag übernehmen' })).not.toBeInTheDocument();
  });

  it('übernimmt den Vorschlag erst nach Bestätigung', async () => {
    const user = userEvent.setup();
    const outcomes = simulate(2000);
    act(() => useAppStore.setState({ outcomes }));
    render(<CalibrationPanel />);

    // Anzeige allein ändert nichts
    expect(useAppStore.getState().weights).toEqual(DEFAULT_WEIGHTS);
    expect(screen.getByLabelText('Gewichtsvorschlag')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Vorschlag übernehmen' }));
    expect(useAppStore.getState().weights).toEqual(DEFAULT_WEIGHTS);

    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(useAppStore.getState().weights).toEqual(DEFAULT_WEIGHTS);

    await user.click(screen.getByRole('button', { name: 'Vorschlag übernehmen' }));
    await user.click(screen.getByRole('button', { name: 'Bestätigen' }));
    const expected = calibrate(outcomes, DEFAULT_WEIGHTS).suggestion?.rawWeights;
    expect(useAppStore.getState().weights).toEqual(expected);
    expect(screen.getByRole('status')).toHaveTextContent('Vorschlag übernommen');
  });
});
