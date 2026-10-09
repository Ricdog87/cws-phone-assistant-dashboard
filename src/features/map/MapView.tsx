import { useSalesforceLink } from '@/app/salesforceLinks';
import { SalesforceLink } from '@/components/SalesforceLink';
import {
  latLngBounds,
  type CircleMarker as LeafletCircleMarker,
  type LatLngBoundsExpression,
  type LatLngExpression,
} from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { todayLocal, useQueue, useScoredLeads } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { BandBadge } from '@/components/BandBadge';
import { Button } from '@/components/Button';
import { activityLabel, cooldownEnds, daysSinceActivity, isInCooldown } from '@/domain/activity';
import type { ScoredLead } from '@/domain/types';
import { MapLegend } from './MapLegend';
import { TERRITORY_POINTS } from '@/data/territory';
import { TerritoryLayer } from './TerritoryLayer';
import { applyMarkerClasses, markerClass } from './mapUtils';

const FALLBACK_CENTER: LatLngExpression = [53.15, 8.0];

/**
 * Passt die Karte ein, sobald der Reiter sichtbar ist. Leaflet kennt die
 * Containergröße erst dann, deshalb zuerst invalidateSize, danach fitBounds.
 */
function FitOnActivate({
  active,
  bounds,
}: {
  active: boolean;
  bounds: LatLngBoundsExpression | null;
}) {
  const map = useMap();
  const fittedFor = useRef<LatLngBoundsExpression | null>(null);

  useEffect(() => {
    if (!active) return;
    map.invalidateSize();
    if (bounds && fittedFor.current !== bounds) {
      map.fitBounds(bounds, { padding: [24, 24] });
      fittedFor.current = bounds;
    }
  }, [active, bounds, map]);

  return null;
}

type Positioned = ScoredLead & { lead: { lat: number; lng: number } };

function hasPosition(entry: ScoredLead): entry is Positioned {
  return entry.lead.lat !== null && entry.lead.lng !== null;
}

function LeadMarker({
  entry,
  inList,
  selected,
  isControl,
  today,
  onSelect,
  onOpenQueue,
}: {
  entry: Positioned;
  inList: boolean;
  selected: boolean;
  isControl: boolean;
  today: string;
  onSelect(): void;
  /** Nur für die Telefonassistenz und nur für Leads ihrer Liste */
  onOpenQueue: (() => void) | null;
}) {
  const { lead } = entry;
  const ref = useRef<LeafletCircleMarker>(null);
  const salesforceLink = useSalesforceLink();
  const blocked = isInCooldown(lead.lastActivity, today);
  const blockedUntil = cooldownEnds(lead.lastActivity);
  const className = markerClass(entry.band, inList && !blocked, selected);

  // Leaflet übernimmt className nur beim Anlegen, spätere Änderungen direkt am Element setzen
  useEffect(() => {
    const element = ref.current?.getElement();
    if (element) applyMarkerClasses(element, className);
  }, [className]);

  return (
    <CircleMarker
      ref={ref}
      center={[lead.lat, lead.lng]}
      radius={selected ? 9 : 7}
      pathOptions={{ className }}
      eventHandlers={{ click: onSelect }}
    >
      <Popup>
        <div className="min-w-[220px] space-y-2 font-sans">
          <div className="flex items-center gap-2">
            <BandBadge band={entry.band} />
            <strong className="text-sm">
              <SalesforceLink target={salesforceLink(lead.id)}>{lead.name}</SalesforceLink>
            </strong>
          </div>
          <div className="text-xs text-muted">
            {lead.industry} · {lead.city}
            <br />
            Score {entry.score} · Hunter {lead.owner ?? 'nicht zugeordnet'}
            <br />
            Letzte Aktivität {activityLabel(daysSinceActivity(lead.lastActivity, today))}
            {isControl && (
              <>
                <br />
                Kontrollstichprobe
              </>
            )}
          </div>
          {blocked ? (
            <div className="text-xs font-bold">
              In Sperrfrist
              {blockedUntil &&
                ` bis ${new Date(`${blockedUntil}T00:00:00`).toLocaleDateString('de-DE')}`}
              , nicht in der Anrufliste.
            </div>
          ) : onOpenQueue ? (
            <Button variant="primary" className="w-full" onClick={onOpenQueue}>
              In Anrufliste öffnen
            </Button>
          ) : null}
        </div>
      </Popup>
    </CircleMarker>
  );
}

export function MapView({ active }: { active: boolean }) {
  const scored = useScoredLeads();
  const queue = useQueue();
  const ownerFilter = useAppStore((s) => s.ownerFilter);
  const viewLevel = useAppStore((s) => s.viewLevel);
  const selectedId = useAppStore((s) => s.selectedLeadId);
  const selectLead = useAppStore((s) => s.selectLead);
  const setTab = useAppStore((s) => s.setTab);

  const controlIds = useMemo(
    () => new Set(queue.filter((e) => e.isControl).map((e) => e.lead.id)),
    [queue],
  );
  const inList = (entry: ScoredLead) => ownerFilter === null || entry.lead.owner === ownerFilter;
  const prospects = scored.filter((e) => !e.lead.isCustomer);
  const positioned = prospects.filter(hasPosition);
  const customers = scored.filter((e) => e.lead.isCustomer).filter(hasPosition);
  const withoutPosition = prospects.filter((e) => inList(e) && !hasPosition(e)).length;
  const today = todayLocal();

  // Beim ersten Öffnen das ganze Vertriebsgebiet zeigen
  const bounds = useMemo(() => latLngBounds(TERRITORY_POINTS), []);

  return (
    <div className="relative h-full">
      <MapContainer
        center={FALLBACK_CENTER}
        zoom={9}
        className="h-full w-full"
        preferCanvas={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende · Grenzen: <a href="https://www.naturalearthdata.com">Natural Earth</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitOnActivate active={active} bounds={bounds} />
        <TerritoryLayer />
        {/* Andere Listen zuerst, damit die gewählte Potenzialliste oben liegt */}
        {[...positioned]
          .sort((a, b) => Number(inList(a)) - Number(inList(b)))
          .map((entry) => (
            <LeadMarker
              key={entry.lead.id}
              entry={entry}
              inList={inList(entry)}
              selected={entry.lead.id === selectedId}
              isControl={controlIds.has(entry.lead.id)}
              today={today}
              onSelect={() => selectLead(entry.lead.id)}
              onOpenQueue={
                viewLevel === 'assistant' && inList(entry)
                  ? () => {
                      selectLead(entry.lead.id);
                      setTab('queue');
                    }
                  : null
              }
            />
          ))}
        {customers.map((entry) => (
          <CircleMarker
            key={entry.lead.id}
            center={[entry.lead.lat, entry.lead.lng]}
            radius={6}
            pathOptions={{ className: 'customer-marker' }}
          >
            <Tooltip>
              Bestandskunde: {entry.lead.name}, {entry.lead.city}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <MapLegend owner={ownerFilter} withoutPosition={withoutPosition} />
    </div>
  );
}
