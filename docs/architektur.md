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

IndexedDB-Tabellen (src/data/db.ts): outcomes, columnMappings, geocodeCache
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

### CSV-Import und Geocoding

- `src/data/csvMapping.ts`: Zielfelder, Namensvorschläge, Zahl- und Ja/Nein-Werte.
- `src/data/csvImport.ts`: Zod-Schema je Zeile, `validateCsvRows` für die Vorprüfung,
  `importCsvRows` für den Import mit Geocoding, Fehlerliste je Zeile.
- `src/data/mappingRepository.ts`: gespeicherte Spaltenzuordnungen in IndexedDB,
  Schlüssel ist die Kopfzeile unabhängig von Reihenfolge und Schreibweise.
- `src/data/geocoding/`: austauschbarer Geocoder. Aufbau von außen nach innen:

  ```
  CachedGeocoder (IndexedDB) → RateLimitedGeocoder (1 Anfrage / 1,1 s) → NominatimGeocoder
  ```

  Treffer aus dem Zwischenspeicher belasten das Rate-Limit nicht. Nicht gefundene
  Adressen werden 7 Tage lang nicht erneut angefragt. Nach drei Dienstfehlern in Folge
  bricht der Import das Nachschlagen ab und listet die übrigen Zeilen als nicht gefunden.

Einen anderen Dienst anbinden (etwa einen eigenen Geocoding-Server für große Mengen):
Klasse mit der Schnittstelle `Geocoder` aus `src/data/geocoding/types.ts` anlegen, in
`createGeocoder()` in `src/data/geocoding/index.ts` eintragen und in `src/app/services.ts`
auswählen. Zwischenspeicher und Rate-Limit lassen sich unverändert davorschalten.

`src/app/services.ts` ist die zentrale Stelle, an der Repository, Zuordnungsspeicher,
Zwischenspeicher und Geocoder erzeugt werden.

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

### Briefing

Austauschbar über die Schnittstelle `BriefingGenerator` (`src/data/briefing/types.ts`):

| Implementierung              | Datei                   | Verhalten                                         |
| ---------------------------- | ----------------------- | ------------------------------------------------- |
| `RuleBasedBriefingGenerator` | `ruleBasedGenerator.ts` | Standard, Regeln aus `src/domain/briefing.ts`     |
| `LlmBriefingGenerator`       | `llmGenerator.ts`       | Sprachmodell über den eigenen Proxy               |
| `FallbackBriefingGenerator`  | `fallbackGenerator.ts`  | versucht das Modell, sonst automatisch die Regeln |

Ablauf beim Sprachmodell:

```
Browser                         Vite-Server (Proxy)                Modell-Endpunkt
buildBriefingRequest ──POST──▶  /api/briefing                      (OpenAI-kompatibel)
  nur Merkmale, keine Namen     Zod prüft Anfrage (strikt)
                                Schlüssel aus .env ──────────────▶ response_format json_schema
                                Zod prüft Antwort (strikt) ◀──────
fillPlaceholders ◀── JSON ────
  setzt {{firma}} und
  {{ansprechpartner}} ein
```

- **Schlüssel**: `LLM_API_KEY` ohne `VITE_`-Präfix, wird nur in `vite.config.ts` über
  `loadEnv` gelesen und an den Proxy übergeben. Er gelangt nie ins Browser-Bundle.
- **Datensparsamkeit**: An das Modell gehen Branche, Ort, Größenangaben und Signale. Firmenname,
  Ansprechpartner, Telefon und Straße bleiben im Browser und werden erst dort eingesetzt.
- **Antwortformat**: striktes JSON-Schema mit `aufhaenger[]`, `einstiegssatz`,
  `einwandbehandlung[]` (`src/data/briefing/schema.ts`). Abweichende Antworten werden
  verworfen.
- **Rückfall**: Fehlende Konfiguration (503), Fehler des Modells (502), Zeitüberschreitung
  (504), Netzwerkfehler oder ungültige Antwort führen automatisch zum regelbasierten Briefing.
  Die Oberfläche zeigt den Grund an.
- **Log**: Der Proxy protokolliert nur Ereignis, Status und Dauer. Im Browser erscheint bei
  einem Rückfall nur die Fehlerkategorie. Weder Lead-Daten noch Modellantworten noch der
  Schlüssel werden protokolliert. Tests prüfen das.
- **Kosten**: Anfragen starten erst nach 400 ms Verweildauer auf einem Lead, gleiche
  Merkmale werden nicht erneut angefragt.

Für den Betrieb hinter statischem Hosting wird `handleBriefingRequest` aus
`server/briefingHandler.ts` unverändert als Serverless-Funktion unter `/api/briefing`
bereitgestellt, oder `VITE_BRIEFING_ENDPOINT` zeigt auf den Ort der Funktion.

Einen anderen Anbieter ohne OpenAI-kompatible Schnittstelle bindet man im Proxy an
(`handleBriefingRequest`), nicht im Browser. Der Vertrag zum Browser bleibt gleich.

### Kalibrierung

`src/domain/calibration.ts` ist eine reine Funktion: Sie liest die gespeicherten
`CallOutcome`-Datensätze, rechnet Terminquoten je Band und Dimension und ab 300 Anrufen
eine logistische Regression (Newton-Verfahren, eigene Lineare Algebra ohne
Zusatzbibliothek). `CalibrationPanel` im Reiter Scoring zeigt das Ergebnis. Die Gewichte
ändert nur die Aktion `setWeights` im Store, ausgelöst durch die Bestätigung im UI.
Regeln und Begründung stehen in `docs/scoring.md`, Abschnitt 6.

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
