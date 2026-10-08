import { useEffect, type ReactNode } from 'react';
import { DemoNotice } from '@/components/DemoNotice';
import { dueRecallCount } from '@/domain/recall';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { DataView } from '@/features/data/DataView';
import { MapView } from '@/features/map/MapView';
import { QueueView } from '@/features/queue/QueueView';
import { salesforceCalendarHref } from '@/features/queue/useEventBooking';
import { RecallsView } from '@/features/recalls/RecallsView';
import { useOpenRecalls } from '@/features/recalls/useRecalls';
import { ScoringView } from '@/features/scoring/ScoringView';
import { todayLocal } from './selectors';
import { bootstrap, useAppStore, type TabId } from './store';
import { allowedTab, isTab, navFor, tabsFor } from './tabs';
import { UserBadge } from './UserBadge';
import { LoginScreen } from './login/LoginScreen';

export function App() {
  const selectedTab = useAppStore((s) => s.activeTab);
  const setTab = useAppStore((s) => s.setTab);
  const sourceId = useAppStore((s) => s.sourceId);
  const sourceLabel = useAppStore((s) => s.sourceLabel);
  const viewLevel = useAppStore((s) => s.viewLevel);
  const signedIn = useAppStore((s) => s.signedIn);
  const workplace = viewLevel === 'assistant';
  // Rechte je Rolle: Einstellungen (Scoring, Daten) nur für Teamleitung und Head of Sales
  const nav = navFor(viewLevel);
  const tabs = tabsFor(viewLevel);
  const calendarHref = salesforceCalendarHref();
  const activeTab = allowedTab(viewLevel, selectedTab);
  const badges = useTabBadges();
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
            <h1 className="text-base font-bold leading-tight">Lead-Cockpit · New Business</h1>
            <p className="truncate text-xs text-muted">{scope ?? sourceLabel}</p>
          </div>
          <UserBadge />
        </div>
        {nav.length > 1 && (
          <div className="flex items-center border-t border-border px-4 py-1.5">
            <nav aria-label="Bereiche" className="flex max-w-full gap-1 overflow-x-auto">
              {nav.map((item) => {
                if (!isTab(item)) {
                  // Termine liegen in Salesforce: der Eintrag öffnet den Kalender im neuen Tab
                  if (!calendarHref) return null;
                  return (
                    <a
                      key={item.label}
                      href={calendarHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Öffnet den Salesforce-Kalender in der Wochenansicht"
                      className={`${NAV_ITEM} text-brand-ink hover:bg-surface`}
                    >
                      {item.label}
                      <span aria-hidden className="ml-1 text-xs text-muted">
                        ↗
                      </span>
                      <span className="sr-only"> (Salesforce-Kalender, neuer Tab)</span>
                    </a>
                  );
                }
                const active = item.id === activeTab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`tab-${item.id}`}
                    aria-current={active ? 'page' : undefined}
                    aria-controls={`panel-${item.id}`}
                    onClick={() => setTab(item.id)}
                    className={`${NAV_ITEM} ${
                      active
                        ? 'bg-brand-ink font-bold text-on-primary'
                        : 'text-brand-ink hover:bg-surface'
                    }`}
                  >
                    {item.label}
                    <TabBadge count={badges[item.id]} hint={BADGE_HINTS[item.id]} />
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {workplace && sourceId === 'mock' && <DemoNotice />}

      <main className="min-h-0 flex-1">
        {activeTab === 'queue' && (
          <TabPanel id="queue">
            <QueueView />
          </TabPanel>
        )}
        {activeTab === 'recalls' && (
          <TabPanel id="recalls">
            <RecallsView />
          </TabPanel>
        )}
        {/* Die Karte bleibt montiert, damit Ausschnitt und Zoom beim Reiterwechsel erhalten bleiben */}
        {tabs.some((tab) => tab.id === 'map') && (
          <TabPanel id="map" hidden={activeTab !== 'map'}>
            <MapView active={activeTab === 'map'} />
          </TabPanel>
        )}
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

const NAV_ITEM = 'whitespace-nowrap rounded px-2 py-1.5 text-sm sm:px-3';

const BADGE_HINTS: Partial<Record<TabId, string>> = {
  recalls: 'fällig',
};

/** Zähler am Reiter Wiedervorlagen: heute fällige und überfällige */
function useTabBadges(): Partial<Record<TabId, number>> {
  const recalls = useOpenRecalls();
  const today = todayLocal();
  return { recalls: dueRecallCount(recalls, today) };
}

function TabBadge({ count, hint }: { count: number | undefined; hint: string | undefined }) {
  if (!count) return null;
  return (
    <>
      <span
        aria-hidden
        className="ml-1.5 inline-block min-w-[1.25rem] rounded-full bg-brand-primary px-1.5 text-center text-xs font-bold tabular-nums text-on-primary"
      >
        {count}
      </span>
      <span className="sr-only">
        , {count} {hint}
      </span>
    </>
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
      role="region"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      hidden={hidden}
      className="h-full"
    >
      {children}
    </div>
  );
}
