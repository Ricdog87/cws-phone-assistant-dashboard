# Lead-Cockpit Nordwest

Arbeitsoberfläche für die Telefonassistenz im New Business der CWS Workwear.

- sortiert Leads danach, wie wahrscheinlich ein Termin ist
- liefert je Lead ein Gesprächsbriefing mit Aufhängern und Einstiegssatz
- erfasst das Anrufergebnis per Klick oder Taste und speichert es lokal
- zeigt die Leads auf einer Karte entlang der Serviceroute
- wertet die Terminquote nach Band und gegen eine Kontrollstichprobe aus

Die erfassten Ergebnisse sind die Trainingsdaten für ein späteres Modell.

## Start

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm run dev          # http://localhost:5173
```

Weitere Befehle:

| Befehl            | Zweck                            |
| ----------------- | -------------------------------- |
| `npm run build`   | Typprüfung und Produktions-Build |
| `npm run preview` | Build lokal ansehen              |
| `npm run test`    | Unit- und Komponententests       |
| `npm run lint`    | ESLint und Prettier-Prüfung      |
| `npm run format`  | Formatierung anwenden            |

Kein Backend, keine API-Schlüssel. Die Kartenkacheln kommen von OpenStreetMap.

## Bedienung

| Reiter     | Inhalt                                                                             |
| ---------- | ---------------------------------------------------------------------------------- |
| Anrufliste | Warteschlange links, Briefing rechts, Ergebnis mit Taste 1 bis 4 buchen            |
| Karte      | Route, Korridor, Leads nach Band, Bestandskunden separat                           |
| Dashboard  | Anrufe, Termine, Termine je 100 Anrufe, Quote nach Band, Kontrolle, CSV-Export     |
| Scoring    | Gewichte, Korridor, Kontrollstichprobe, Briefing-Variante, Rangfolge, Kalibrierung |
| Daten      | Datenquelle wählen, CSV mit Spaltenzuordnung importieren                           |

Tastatur in der Anrufliste: Pfeil hoch und runter wechselt den Lead, 1 Termin vereinbart,
2 Wiedervorlage, 3 Nicht erreicht, 4 Kein Interesse. Nach dem Buchen springt die Auswahl
auf den nächsten offenen Lead.

Die Anrufergebnisse liegen in der IndexedDB des Browsers und überstehen einen Reload.
Sie gelten nur für diesen Browser auf diesem Rechner. Vor dem Leeren der Browserdaten
exportieren.

## Struktur

```
src/
  app/            App-Shell, Reiter, Store, Selektoren
  components/     wiederverwendbare UI-Bausteine
  features/
    queue/        Anrufliste, Briefing, Ergebniserfassung
    map/          Karte mit Korridor
    dashboard/    Kennzahlen und Export
    scoring/      Gewichtung und Rangfolgevorschau
    data/         Datenquelle und CSV-Import
  domain/         reine Fachlogik, ohne React und DOM
  data/
    providers/    Mock, CSV, Clay, D&B, Salesforce
    repository.ts Ablage der Anrufergebnisse
  styles/         Marken-Tokens und Basisstile
server/           Briefing-Proxy für den Vite-Server
docs/
  architektur.md  Aufbau, Datenfluss, Anbindung Clay, D&B und CRM
  scoring.md      Scoring-Regeln in Prosa und offene Abstimmungspunkte
  datenmodell.md  Felder je Quelle und offene Zuordnungsfragen
tests/            Vitest und Testing Library
```

## Neue Datenquelle ergänzen

1. In `src/data/providers/types.ts` die `ProviderId` um die neue Quelle erweitern.
2. Unter `src/data/providers/` eine Klasse anlegen, die `LeadProvider` implementiert.
   `load()` liefert fertige `Lead`-Objekte. Datensätze ohne Koordinaten gar nicht erst
   zurückgeben oder vorher geocodieren.
3. Die Feldzuordnung als `FieldMapping`-Konstante in derselben Datei dokumentieren und in
   `docs/datenmodell.md` ergänzen.
4. In `src/data/providers/index.ts` bei `PROVIDER_OPTIONS` und `createProvider`
   eintragen. Danach erscheint die Quelle im Reiter Daten.
5. Zugangsdaten gehören auf einen Server, nie in den Quelltext oder den Browser.

Details und die vorgesehenen Anbindungspunkte für Clay, Dun & Bradstreet und das CRM
stehen in `docs/architektur.md`.

## CSV-Import

Erste Zeile mit Spaltennamen, Trennzeichen Komma, Semikolon oder Tab, Zahlen mit Punkt
oder Komma.

1. Datei wählen. Die Zuordnung der Spalten wird vorgeschlagen: aus einem früheren Import
   mit denselben Spalten, sonst aus üblichen Spaltennamen.
2. Je Zielfeld die Quellspalte prüfen. Pflicht ist der Firmenname, dazu Breiten- und
   Längengrad oder Ort bzw. PLZ. Die Vorprüfung zeigt sofort, wie viele Zeilen gültig sind.
3. Importieren. Die Zuordnung wird gespeichert und beim nächsten Import vorgeschlagen.
   Zeilen ohne Koordinaten werden über OpenStreetMap Nominatim nachgeschlagen
   (abschaltbar, höchstens eine Anfrage pro Sekunde, lokaler Zwischenspeicher).
4. Fehlerhafte Zeilen stehen in der Fehlerliste mit Zeilennummer, Feld, Wert und Grund
   und lassen sich als CSV exportieren.

An Nominatim gehen nur Straße, PLZ und Ort, keine Firmennamen. Optional eine
Kontaktadresse in `.env.local` hinterlegen, siehe `.env.example`.

## Briefing über Sprachmodell

Standard ist das regelbasierte Briefing. Im Reiter Scoring lässt sich auf „Sprachmodell“
umschalten. Dafür in `.env.local` einen OpenAI-kompatiblen Endpunkt eintragen:

```bash
LLM_API_URL=https://…/v1/chat/completions
LLM_API_KEY=…
LLM_MODEL=…
```

Der Schlüssel bleibt im lokalen Vite-Server und gelangt nicht in den Browser. An das Modell
gehen keine Firmennamen, Ansprechpartner oder Telefonnummern. Ist nichts konfiguriert oder
fällt der Aufruf aus, greift automatisch das regelbasierte Briefing. Details in
`docs/architektur.md`.

## Kalibrierung

Der Reiter Scoring zeigt die tatsächliche Terminquote je Band und je Dimension. Ab 300
erfassten Anrufen schlägt eine logistische Regression neue Gewichte vor. Der Vorschlag
greift nie automatisch, er muss übernommen und bestätigt werden. Details in
`docs/scoring.md`, Abschnitt 6.

## Bewusst nicht enthalten

- keine Bonitäts- oder Zahlungsdatenbewertung
- keine Anbindung an ein Produktivsystem, die Provider für Clay, D&B und Salesforce sind
  Gerüste
- keine automatisierte Ansprache, kein Versand, kein Telefonieagent
- keine echten Kundendaten, alle Demo-Datensätze sind erfunden

## Offene Punkte

Siehe `docs/scoring.md`, Abschnitt 7, und `docs/datenmodell.md`, offene Zuordnungsfragen.
Das Logo liegt unter `public/logo.png` (582 × 82 px), die Favicons unter
`public/favicon-32.png` und `public/apple-touch-icon.png` sind aus der CWS-Wortmarke
abgeleitet.
