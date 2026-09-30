import { useEffect, type ReactNode } from 'react';
import { DemoNotice } from '@/components/DemoNotice';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { DataView } from '@/features/data/DataView';
import { MapView } from '@/features/map/MapView';
import { QueueView } from '@/features/queue/QueueView';
import { ScoringView } from '@/features/scoring/ScoringView';
import { bootstrap, useAppStore } from './store';
import { TABS } from './tabs';

export function App() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setTab = useAppStore((s) => s.setTab);
  const sourceId = useAppStore((s) => s.sourceId);
  const sourceLabel = useAppStore((s) => s.sourceLabel);

  useEffect(() => {
    void bootstrap();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-border bg-panel px-4 py-2">
        <img src="/logo.svg" alt="CWS" className="h-8 w-auto" />
        <div className="min-w-0">
          <h1 className="text-base font-bold leading-tight">Lead-Cockpit Nordwest</h1>
          <p className="text-xs text-muted">
            New Business, Telefonassistenz · Quelle: {sourceLabel}
          </p>
        </div>
        <nav role="tablist" aria-label="Bereiche" className="ml-auto flex gap-1">
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setTab(tab.id)}
                className={`rounded px-3 py-2 text-sm font-bold ${
                  active ? 'bg-brand-ink text-on-primary' : 'text-brand-ink hover:bg-surface'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      {sourceId === 'mock' && <DemoNotice />}

      <main className="min-h-0 flex-1">
        {activeTab === 'queue' && (
          <TabPanel id="queue">
            <QueueView />
          </TabPanel>
        )}
        {/* Die Karte bleibt montiert, damit Ausschnitt und Zoom beim Reiterwechsel erhalten bleiben */}
        <TabPanel id="map" hidden={activeTab !== 'map'}>
          <MapView active={activeTab === 'map'} />
        </TabPanel>
        {activeTab === 'dashboard' && (
          <TabPanel id="dashboard">
            <DashboardView />
          </TabPanel>
        )}
        {activeTab === 'scoring' && (
          <TabPanel id="scoring">
            <ScoringView />
          </TabPanel>
        )}
        {activeTab === 'data' && (
          <TabPanel id="data">
            <DataView />
          </TabPanel>
        )}
      </main>
    </div>
  );
}

function TabPanel({
  id,
  hidden = false,
  children,
}: {
  id: string;
  hidden?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      hidden={hidden}
      className="h-full"
    >
      {children}
    </div>
  );
}
