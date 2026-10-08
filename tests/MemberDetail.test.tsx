import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { teamStanding } from '@/domain/standings';
import { MemberDetail } from '@/features/dashboard/MemberDetail';

const member = teamStanding(
  [
    {
      id: 'p1',
      givenName: 'Erika',
      familyName: 'Beispiel',
      dayCalls: 40,
      weekCalls: 180,
      weekAppointments: 3,
      live: false,
    },
  ],
  'nord',
  'Nord',
).members[0];

describe('MemberDetail', () => {
  it('ordnet die Person über das Auswahlfeld einem Hunter zu', async () => {
    if (!member) throw new Error('Person fehlt');
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MemberDetail
        id="detail"
        member={member}
        groupLabel="Team Nord"
        assignment={{
          hunter: 'Hunter A',
          options: [
            { name: 'Hunter A', area: 'Gebiet A' },
            { name: 'Hunter B', area: null },
          ],
          onChange,
        }}
        onClose={() => undefined}
      />,
    );
    const select = screen.getByLabelText('Arbeitet für Hunter (Sales Rep)');
    expect(select).toHaveValue('Hunter A');
    await user.selectOptions(select, 'Hunter B');
    expect(onChange).toHaveBeenCalledWith('Hunter B');
    await user.selectOptions(select, '');
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText(/Werdegang/)).toBeInTheDocument();
  });
});
