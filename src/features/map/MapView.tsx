import {
  latLngBounds,
  type CircleMarker as LeafletCircleMarker,
  type LatLngBoundsExpression,
  type LatLngExpression,
} from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { useQueue, useScoredLeads } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { BandBadge } from '@/components/BandBadge';
import { Button } from '@/components/Button';
import { formatKm, formatMin } from '@/components/format';
import type { Route, ScoredLead } from '@/domain/types';
import { MapLegend } from './MapLegend';
import { applyMarkerClasses, corridorWeightPx, markerClass } from './mapUtils';

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

function CorridorLayer({ route, corridorKm }: { route: Route; corridorKm: number }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const positions = route.points.map((p) => [p.lat, p.lng] as [number, number]);
  const midLat = route.points.reduce((sum, p) => sum + p.lat, 0) / Math.max(1, route.points.length);
  const weight = corridorWeightPx(corridorKm, midLat, zoom);

  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{ className: 'map-corridor', weight, lineCap: 'round', lineJoin: 'round' }}
        interactive={false}
      />
      <Polyline
        positions={positions}
        pathOptions={{ className: 'map-route', weight: 3 }}
        interactive={false}
      />
    </>
  );
}

function LeadMarker({
  entry,
  selected,
  isControl,
  onSelect,
  onOpenQueue,
}: {
  entry: ScoredLead;
  selected: boolean;
  isControl: boolean;
  onSelect(): void;
  onOpenQueue(): void;
}) {
  const { lead } = entry;
  const inQueue = entry.inCorridor;
  const ref = useRef<LeafletCircleMarker>(null);
  const className = markerClass(entry.band, entry.inCorridor, selected);

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
            <strong className="text-sm">{lead.name}</strong>
          </div>
          <div className="text-xs text-muted">
            {lead.industry} · {lead.city}
            <br />
            Score {entry.score} · {formatKm(entry.distanceKm)} · {formatMin(entry.detourMinutes)}{' '}
            Umweg
            {isControl && (
              <>
                <br />
                Kontrollstichprobe
              </>
            )}
          </div>
          {inQueue ? (
            <Button variant="primary" className="w-full" onClick={onOpenQueue}>
              In Anrufliste öffnen
            </Button>
          ) : (
            <div className="text-xs">Außerhalb des Korridors, nicht in der Warteschlange.</div>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}

export function MapView({ active }: { active: boolean }) {
  const scored = useScoredLeads();
  const queue = useQueue();
  const route = useAppStore((s) => s.route);
  const corridorKm = useAppStore((s) => s.corridorKm);
  const selectedId = useAppStore((s) => s.selectedLeadId);
  const selectLead = useAppStore((s) => s.selectLead);
  const setTab = useAppStore((s) => s.setTab);

  const controlIds = useMemo(
    () => new Set(queue.filter((e) => e.isControl).map((e) => e.lead.id)),
    [queue],
  );
  const prospects = scored.filter((e) => !e.lead.isCustomer);
  const customers = scored.filter((e) => e.lead.isCustomer);

  const leads = useAppStore((s) => s.leads);
  const bounds = useMemo(() => {
    const points = [...route.points, ...leads].map((p) => [p.lat, p.lng] as [number, number]);
    return points.length > 0 ? latLngBounds(points) : null;
  }, [route, leads]);

  return (
    <div className="relative h-full">
      <MapContainer
        center={FALLBACK_CENTER}
        zoom={9}
        className="h-full w-full"
        preferCanvas={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitOnActivate active={active} bounds={bounds} />
        <CorridorLayer route={route} corridorKm={corridorKm} />
        {/* Leads außerhalb zuerst, damit die aktiven oben liegen */}
        {[...prospects]
          .sort((a, b) => Number(a.inCorridor) - Number(b.inCorridor))
          .map((entry) => (
            <LeadMarker
              key={entry.lead.id}
              entry={entry}
              selected={entry.lead.id === selectedId}
              isControl={controlIds.has(entry.lead.id)}
              onSelect={() => selectLead(entry.lead.id)}
              onOpenQueue={() => {
                selectLead(entry.lead.id);
                setTab('queue');
              }}
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
      <MapLegend corridorKm={corridorKm} />
    </div>
  );
}
