# Architektur

## Überblick

Reine Browser-Anwendung ohne Backend. Vite, React 18 und TypeScript im strict-Modus,
Zustand als Store, Dexie für IndexedDB, react-leaflet mit OpenStreetMap-Kacheln.

```
┌──────────────┐    load()     ┌────────────┐   leads, Gewichte,   ┌──────────────┐
│ LeadProvider │ ────────────▶ │  Store     │   Korridor ────────▶ │  domain/     │
│ Mock, CSV,   │               │ (Zustand)  │ ◀──────────────────── │  scoring,    │
│ Clay, D&B,   │               │            │   ScoredLead,        │  sampling,   │
│ Salesforce   │               │            │   QueueEntry         │  briefing    │
└──────────────┘               └─────┬──────┘                      └──────────────┘
                                     │ addOutcome()
                                     ▼
                              ┌──────────────────┐
                              │ OutcomeRepository│  Dexie (IndexedDB)
                              └──────────────────┘
```

## Schichten

| Ordner            | Aufgabe                                                                                                         | Darf importieren                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `src/domain/`     | Fachlogik als reine Funktionen: Geometrie, Scoring, Stichprobe, Warteschlange, Briefing, Kennzahlen, CSV-Export | nur `domain/`                             |
| `src/data/`       | Datenquellen (Provider), CSV-Zuordnung, Demo-Daten, Repository                                                  | `domain/`                                 |
| `src/app/`        | App-Shell, Reiter, Store, abgeleitete Selektoren                                                                | alles                                     |
| `src/features/*`  | Je Reiter ein Ordner mit Ansicht und eigenen Hooks                                                              | `app/`, `components/`, `domain/`, `data/` |
| `src/components/` | Wiederverwendbare UI-Bausteine ohne Fachlogik                                                                   | `domain/types`                            |
| `src/styles/`     | Marken-Tokens als CSS-Variablen, Tailwind-Basis, Kartenstile                                                    | –                                         |

Die Regel „domain ohne React und DOM“ ist in `eslint.config.js` abgesichert.

## Datenfluss

1. Beim Start lädt `bootstrap()` die Demo-Daten und die gespeicherten Anrufergebnisse.
2. Der Store hält Rohdaten und Einstellungen: Leads, Route, Gewichte, Korridor,
   Stichprobe, Auswahl, Ergebnisse.
3. `useScoredLeads()` und `useQueue()` in `src/app/selectors.ts` berechnen daraus per
   `useMemo` die bewerteten Leads und die Warteschlange. Abgeleitete Werte liegen nie im
   Store, damit sie nicht veralten.
4. Ein gebuchtes Ergebnis wird als `CallOutcome` mit allen Merkmalen zum Zeitpunkt des
   Anrufs gespeichert und über das `OutcomeRepository` in IndexedDB abgelegt.
5. Dashboard und Export lesen ausschließlich aus den gespeicherten Ergebnissen.
6. `goalProgress()` in `src/domain/goals.ts` zählt daraus den Tages- und Wochenstand. Jedes
   Ergebnis ist ein Anruf, „Termin vereinbart“ ist ein Termin. Die Woche läuft von Montag
   0:00 bis zum nächsten Montag, Ortszeit. Das Wochenziel sind 4 vereinbarte Termine
   (`WEEKLY_APPOINTMENT_GOAL`). Das Tagesziel sind etwa 50 Anrufe (`DAILY_CALL_GOAL`).
   Anrufliste und Dashboard zeigen den Stand, dazu Wochentag, Datum und die restlichen
   Tage bis Sonntag. Abgelegt wird das nicht im Store.

## Erweiterungspunkte

### Neue Datenquelle

Jede Quelle implementiert `LeadProvider` aus `src/data/providers/types.ts`:

```ts
interface LeadProvider {
  readonly id: ProviderId;
  readonly label: string;
  load(): Promise<Lead[]>;
}
```

Schritte: `ProviderId` erweitern, Klasse unter `src/data/providers/` anlegen,
in `src/data/providers/index.ts` bei `PROVIDER_OPTIONS` und `createProvider` eintragen.
Die Umwandlung in `Lead` gehört in den Provider, nicht in die Oberfläche.

### Anbindung Clay

- Datei: `src/data/providers/clayProvider.ts`, Feldzuordnung `CLAY_FIELD_MAPPING`.
- Weg: Clay reichert eine Tabelle an und übergibt die Zeilen per Webhook oder
  HTTP-API-Spalte an einen eigenen, schlanken Endpunkt (etwa eine Serverless-Funktion).
  `ClayProvider.load()` ruft diesen Endpunkt ab.
- Der Clay-Schlüssel bleibt auf dem Server. Aus dem Browser wird Clay nie direkt
  aufgerufen.

### Anbindung Dun & Bradstreet

- Datei: `src/data/providers/dnbProvider.ts`, Feldzuordnung `DNB_FIELD_MAPPING`.
- Weg: Abruf über Direct+ auf einem eigenen Server, Übergabe der Firmendaten im
  `Lead`-Format an den Provider. D&B liefert Firmografie und Koordinaten, keine Signale
  wie offene Stellen.
- Bonitäts- und Zahlungsdaten werden nicht abgerufen und fließen nicht ins Scoring ein.

### Anbindung CRM (Salesforce)

Zwei Richtungen:

1. **Lesen**: `src/data/providers/salesforceProvider.ts`, Feldzuordnung
   `SALESFORCE_FIELD_MAPPING`. Leads aus dem Objekt Lead, Bestandskunden aus Account mit
   aktivem Vertrag. Zugriff über einen Server mit OAuth, nie mit Zugangsdaten im Browser.
2. **Zurückschreiben**: `OutcomeRepository` in `src/data/repository.ts` um eine zweite
   Implementierung ergänzen, die jedes `CallOutcome` als Task am Lead ablegt. Die
   Dexie-Implementierung bleibt als lokaler Puffer bestehen, damit bei Netzausfall nichts
   verloren geht. Der Store kennt nur die Schnittstelle, der Austausch passiert in
   `createRepository()` in `src/app/store.ts`.

### Route

Die Route ist heute die Beispielroute in `src/data/mockRoute.ts`. Für echte Touren wird
eine Quelle analog zum `LeadProvider` ergänzt (`RouteProvider`) und die Route im Store
über eine Setter-Aktion gesetzt. Alle Berechnungen arbeiten bereits mit beliebigen
Polylines.

### Briefing und Kalibrierung

- Das Briefing ist regelbasiert in `src/domain/briefing.ts`. Ein austauschbarer Generator
  kann dieselbe Rückgabe (`Briefing`) liefern.
- Eine spätere Kalibrierung liest die gespeicherten `CallOutcome`-Datensätze. Diese
  enthalten Dimensionen, Gewichte und die Kennzeichnung der Kontrollstichprobe.

## Karte

Die Karte bleibt nach dem ersten Rendern montiert und ist nur ausgeblendet, wenn ein
anderer Reiter aktiv ist. Beim Einblenden ruft `FitOnActivate` zuerst `invalidateSize()`
und dann `fitBounds()` auf, weil Leaflet die Größe eines ausgeblendeten Containers nicht
kennt. Farben kommen über CSS-Klassen (`src/styles/map.css`) aus den Tokens. Der Korridor
ist eine breite Linie, deren Pixelbreite bei jedem Zoom aus der Korridorbreite in
Kilometern berechnet wird.

## Tests

`npm run test` startet Vitest mit jsdom. Unit-Tests für `domain/` mit festen
Erwartungswerten, Tests für CSV-Zuordnung und Repository (IndexedDB über
`fake-indexeddb`) sowie Komponententests der Anrufliste mit Testing Library.
