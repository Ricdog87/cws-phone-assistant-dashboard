import { useEffect, type ReactNode } from 'react';
import { DemoNotice } from '@/components/DemoNotice';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { DataView } from '@/features/data/DataView';
import { MapView } from '@/features/map/MapView';
import { QueueView } from '@/features/queue/QueueView';
import { ScoringView } from '@/features/scoring/ScoringView';
import { bootstrap, useAppStore } from './store';
import { TABS } from './tabs';
import { UserBadge } from './UserBadge';
import { LoginScreen } from './login/LoginScreen';

export function App() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setTab = useAppStore((s) => s.setTab);
  const sourceId = useAppStore((s) => s.sourceId);
  const sourceLabel = useAppStore((s) => s.sourceLabel);
  const viewLevel = useAppStore((s) => s.viewLevel);
  const signedIn = useAppStore((s) => s.signedIn);
  const workplace = viewLevel === 'assistant';
  const scope =
    viewLevel === 'director'
      ? 'Vertriebsgebiet Nordwest'
      : viewLevel === 'teamLead'
        ? 'Region Nord'
        : null;

  useEffect(() => {
    void bootstrap();
  }, []);

  if (!signedIn) return <LoginScreen />;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-panel">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <img
            src="/logo.png"
            alt="CWS Workwear"
            width={582}
            height={82}
            className="h-8 w-auto shrink-0 select-none"
            draggable={false}
          />
          <div className="mr-auto min-w-0">
            <h1 className="text-base font-bold leading-tight">Lead-Cockpit Nordwest</h1>
            <p className="truncate text-xs text-muted">New Business · {scope ?? sourceLabel}</p>
          </div>
          <UserBadge />
        </div>
        {workplace && (
          <div className="flex items-center border-t border-border px-4 py-1.5">
            <nav
              role="tablist"
              aria-label="Bereiche"
              className="flex max-w-full gap-1 overflow-x-auto"
            >
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
                    className={`whitespace-nowrap rounded px-2 py-1.5 text-sm sm:px-3 ${
                      active
                        ? 'bg-brand-ink font-bold text-on-primary'
                        : 'text-brand-ink hover:bg-surface'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {workplace && sourceId === 'mock' && <DemoNotice />}

      <main className="min-h-0 flex-1">
        {workplace && activeTab === 'queue' && (
          <TabPanel id="queue">
            <QueueView />
          </TabPanel>
        )}
        {/* Die Karte bleibt montiert, damit Ausschnitt und Zoom beim Reiterwechsel erhalten bleiben */}
        {workplace && (
          <TabPanel id="map" hidden={activeTab !== 'map'}>
            <MapView active={activeTab === 'map'} />
          </TabPanel>
        )}
        {(!workplace || activeTab === 'dashboard') && (
          <TabPanel id="dashboard">
            <DashboardView />
          </TabPanel>
        )}
        {workplace && activeTab === 'scoring' && (
          <TabPanel id="scoring">
            <ScoringView />
          </TabPanel>
        )}
        {workplace && activeTab === 'data' && (
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
