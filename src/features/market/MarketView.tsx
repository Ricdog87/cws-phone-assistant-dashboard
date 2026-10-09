import { useCallback, useMemo, useState } from 'react';
import { todayLocal, useScoredLeads } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { downloadText } from '@/components/download';
import { formatInt } from '@/components/format';
import { StatTile } from '@/components/StatTile';
import { DEMO_REGIONS } from '@/data/demoTeam';
import { marketToCsv } from '@/domain/export';
import {
  ALL_MARKET,
  contractEndsByQuarter,
  filterMarket,
  industryMatrix,
  solutionBreakdown,
  sortForFollowUp,
  summarizeMarket,
  type MarketFilter,
} from '@/domain/market';
import { CONTRACT_RECALL_MONTHS_BEFORE } from '@/domain/qualificationConfig';
import { buildQueue } from '@/domain/queue';
import { BoardHeader } from '@/features/dashboard/BoardHeader';
import { ContractQuarters } from './ContractQuarters';
import { FollowUpTable } from './FollowUpTable';
import { IndustryMatrix } from './IndustryMatrix';
import { MarketFilters } from './MarketFilters';
import { SolutionBars } from './SolutionBars';
import { TEAM_LEAD_REGION_ID, useMarketRows } from './useCalls';

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/**
 * Wettbewerb und Vertragsenden für alle Rollen: Wer ist bei welchem Anbieter, in welcher
 * Branche, und wann läuft der Vertrag aus. Die Telefonassistenz sieht die Leadliste ihres
 * Hunters, die Teamleitung ihre Region, die Vertriebsleitung alle Regionen.
 */
export function MarketView() {
  const viewLevel = useAppStore((s) => s.viewLevel);
  const ownerFilter = useAppStore((s) => s.ownerFilter);
  const selectLead = useAppStore((s) => s.selectLead);
  const setTab = useAppStore((s) => s.setTab);
  const setIndustryFilter = useAppStore((s) => s.setIndustryFilter);
  const rows = useMarketRows();
  const scored = useScoredLeads();
  const today = todayLocal();
  const [filter, setFilter] = useState<MarketFilter>(ALL_MARKET);
  const assistant = viewLevel === 'assistant';
  const director = viewLevel === 'director';

  const visible = useMemo(() => filterMarket(rows, filter), [rows, filter]);
  const summary = summarizeMarket(visible);
  const bySolution = useMemo(() => filterMarket(rows, filter, ['solution']), [rows, filter]);
  const byFollowUp = useMemo(() => filterMarket(rows, filter, ['followUp']), [rows, filter]);
  const byIndustry = useMemo(() => filterMarket(rows, filter, ['industry']), [rows, filter]);
  const sorted = useMemo(() => sortForFollowUp(visible), [visible]);

  // Anrufen geht nur bei Leads der eigenen Liste außerhalb der Sperrfrist
  const callable = useMemo(
    () =>
      assistant
        ? new Set(
            buildQueue(scored, false, { owner: ownerFilter, today }).map((entry) => entry.lead.id),
          )
        : undefined,
    [assistant, scored, ownerFilter, today],
  );
  const call = useCallback(
    (leadId: string) => {
      setIndustryFilter(null);
      selectLead(leadId);
      setTab('queue');
    },
    [setIndustryFilter, selectLead, setTab],
  );

  const teamRegion = DEMO_REGIONS.find((region) => region.id === TEAM_LEAD_REGION_ID);
  const scope = assistant
    ? ownerFilter
      ? `Leadliste ${ownerFilter}`
      : 'Alle Leads'
    : director
      ? 'Vertriebsgebiet Nordwest'
      : `Team ${teamRegion?.name ?? ''}`;

  const toggle = (patch: Partial<MarketFilter>) => {
    const key = Object.keys(patch)[0] as keyof MarketFilter;
    setFilter({ ...filter, [key]: filter[key] === patch[key] ? 'all' : patch[key] });
  };

  function exportCsv() {
    const slug = scope
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/g, '-')
      .replace(/^-|-$/g, '');
    downloadText(marketToCsv(sorted), `wettbewerb-${slug}-${today}.csv`);
  }

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <BoardHeader
          eyebrow={`Wettbewerb · ${scope}`}
          title="Wettbewerb und Vertragsenden"
          subtitle={`Aktuelle Lösung aus dem jüngsten Gespräch je Firma. Nachfassen ab ${CONTRACT_RECALL_MONTHS_BEFORE} Monate vor Vertragsende.`}
        />

        <MarketFilters
          rows={rows}
          filter={filter}
          onChange={setFilter}
          regions={director ? DEMO_REGIONS : undefined}
          showHunter={!assistant}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Firmen mit Gespräch"
            value={formatInt(summary.companies)}
            hint={`${formatInt(summary.netContacts)} mit dem Entscheider gesprochen`}
          />
          <StatTile
            label="Beim Wettbewerb"
            value={formatInt(summary.competitor)}
            hint={`${percent(summary.competitor, summary.companies)} % der Firmen mit Gespräch`}
            pressed={filter.solution === 'competitor'}
            onSelect={() => toggle({ solution: 'competitor' })}
            filterLabel="Nur Firmen beim Wettbewerb zeigen"
          />
          <StatTile
            label="Jetzt nachfassen"
            value={formatInt(summary.followUpNow)}
            hint={`Vertrag endet in höchstens ${CONTRACT_RECALL_MONTHS_BEFORE} Monaten`}
            pressed={filter.followUp === 'now'}
            onSelect={() => toggle({ followUp: 'now' })}
            filterLabel="Fällige Vertragsenden zeigen"
          />
          <StatTile
            label="Vertragsende fehlt"
            value={formatInt(summary.contractUnknown)}
            hint="Beim nächsten Gespräch erfragen"
            pressed={filter.followUp === 'unknown'}
            onSelect={() => toggle({ followUp: 'unknown' })}
            filterLabel="Wettbewerbskunden ohne Vertragsende zeigen"
          />
        </div>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          <SolutionBars
            slices={solutionBreakdown(bySolution)}
            total={bySolution.length}
            selected={filter.solution}
            onSelect={(solution) => setFilter({ ...filter, solution })}
          />
          <ContractQuarters
            bars={contractEndsByQuarter(byFollowUp, today)}
            unknown={byFollowUp.filter((row) => row.bucket === 'unknown').length}
          />
        </div>

        <IndustryMatrix
          rows={industryMatrix(byIndustry)}
          selected={filter.industry}
          onSelect={(industry) => setFilter({ ...filter, industry })}
        />

        <FollowUpTable
          rows={sorted}
          showAssistant={!assistant}
          callable={callable}
          onCall={assistant ? call : undefined}
          onExport={exportCsv}
        />
      </div>
    </div>
  );
}
