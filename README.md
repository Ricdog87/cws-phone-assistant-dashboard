# Lead-Cockpit · New Business

Arbeitsoberfläche für die Telefonassistenz im New Business der CWS Workwear.

- sortiert Leads danach, wie wahrscheinlich ein Termin ist
- liefert je Lead ein Gesprächsbriefing mit Aufhängern und Einstiegssatz
- erfasst das Anrufergebnis per Klick oder Taste und speichert es lokal
- arbeitet die Potenzialliste je Hunter (Accountinhaber) ab, mit letzter Aktivität
- öffnet für den Termin per Klick das Salesforce-Formular, die Terminvergabe passiert in Salesforce
- zeigt der Teamleitung Team, Hunter und Termine in Salesforce übersichtlich in einem Bereich,
  mit Werdegang je Person
- wertet die Terminquote nach Band und gegen eine Kontrollstichprobe aus

Die erfassten Ergebnisse sind die Trainingsdaten für ein späteres Modell.

## Start

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm run dev          # http://localhost:5173
```

Weitere Befehle:

| Befehl                    | Zweck                                     |
| ------------------------- | ----------------------------------------- |
| `npm run build`           | Typprüfung und Produktions-Build          |
| `npm run preview`         | Build lokal ansehen                       |
| `npm run test`            | Unit- und Komponententests                |
| `npm run lint`            | ESLint und Prettier-Prüfung               |
| `npm run format`          | Formatierung anwenden                     |
| `npm run export:branchen` | Branchengrundwerte als CSV nach `export/` |

Im Browser keine API-Schlüssel. Die Kartenkacheln kommen von OpenStreetMap. Für die
Übertragung an Salesforce gibt es eine Serverfunktion (siehe unten), die erst nach
Freischaltung arbeitet.

## Bedienung

| Reiter         | Inhalt                                                                          | Rollen                     |
| -------------- | ------------------------------------------------------------------------------- | -------------------------- |
| Anrufliste     | Warteschlange links, Briefing rechts, Protokoll und Ergebnis unten (Taste 1–4)  | Telefonassistenz           |
| Wiedervorlagen | Rückrufe und Vertragsenden nach Fälligkeit, Anrufen mit einem Klick             | Telefonassistenz           |
| Dashboard      | Je Rolle: eigene Ziele; Führung mit Team, Hunter, Terminen und Gesprächen       | alle                       |
| Karte          | Leads der Potenzialliste nach Band, andere Hunter blass, Bestandskunden separat | alle                       |
| Scoring        | Gewichte, Kontrollstichprobe, Briefing-Variante, Rangfolge, Kalibrierung        | Teamleitung, Head of Sales |
| Daten          | Datenquelle wählen, CSV mit Spaltenzuordnung importieren                        | Teamleitung, Head of Sales |

Einstellungen (Scoring, Daten) und die Zuordnung der Telefonassistenzen zu den Huntern
sind der Teamleitung und dem Head of Sales vorbehalten. Die Telefonassistenz sieht ihre
Zuordnung, ändern kann sie sie nicht.

Unter dem Briefing steht immer sichtbar das Gesprächsprotokoll mit dem Ergebnis, alles an
einem Fleck: erst die Auswahlfelder Gesprächspartner (Entscheider, Zentrale, Sonstige),
Aktuelle Lösung (kauft Berufskleidung, Mitarbeitende kaufen selbst, Wettbewerb, keine
Berufskleidung) und Wettbewerber (MEWA, Bardusch, DBL, Alsco, Sonstiger), dazu die
Häkchen Firma erloschen, Zentralentscheidung, Bestandskunde und Nicht mehr anrufen, dann
die Notiz zum Telefonat. Darunter die Ergebnisse „Termin vereinbaren“, „Wiedervorlage“,
„Nicht erreicht“ und „Kein Interesse“. Tastatur: Pfeil hoch und runter wechselt den Lead,
1 bis 4 buchen das Ergebnis. Nach dem Buchen springt die Auswahl auf den nächsten offenen
Lead, das Protokoll beginnt leer. Ein Gespräch mit dem Entscheider zählt als Nettokontakt.

Die Wiedervorlage fragt vor dem Buchen nach dem Grund: „Rückruf vereinbart“ mit Datum
(Vorschlag nächster Werktag) und optionaler Uhrzeit, oder „Vertragsende bekannt“; bei
Wettbewerb ist das Vertragsende vorgewählt. Die Notiz kommt aus dem Protokoll.
Beim Vertragsende ergibt sich das Datum aus der bestehenden Regel (erster Werktag des
Monats, neun Monate vorher); liegt das Ende zu nah, schlägt das Cockpit vor, jetzt einen
Termin zu vereinbaren. Escape bricht ab. Der Reiter Wiedervorlagen zeigt alle offenen
Wiedervorlagen nach Fälligkeit (überfällig, heute, nächste 7 Tage, später); die Zahl am
Reiter nennt die heute fälligen. „Anrufen“ öffnet den Account im Briefing. Eine
Wiedervorlage ist erledigt, sobald zum Account ein neues Ergebnis erfasst ist. Jede
Wiedervorlage geht automatisch als offene Aufgabe mit Fälligkeit und Erinnerung nach
Salesforce.

Die Terminvergabe passiert direkt in Salesforce. „Termin vereinbaren“ (Taste 1) öffnet in
einem neuen Tab den Salesforce-Kalender in der Wochenansicht ab heute
(`/lightning/o/Event/home?startDate=…&view=week`). Dort trägt die Telefonassistenz Datum,
Uhrzeit, Hunter und Einladung ein. Das Cockpit erfasst das Ergebnis „Termin vereinbart“ und
überträgt das Anrufprotokoll. Einen eigenen Kalender-Link gibt es im Cockpit nicht, die
Telefonassistenz hat den Salesforce-Kalender ohnehin offen. Standard ist `https://cws-workwear.lightning.force.com`; eine andere Adresse,
etwa eine Sandbox, steht in `VITE_SALESFORCE_URL` (siehe `.env.example`, in Vercel unter
Environment Variables).

### Übertragung an Salesforce

Jedes Ergebnis geht mit seinem Protokoll automatisch als erledigte Aufgabe „Anruf“ nach
Salesforce (Betreff „Anruf: Firma“, Anrufergebnis, Beschreibung mit Gesprächspartner,
aktueller Lösung, Hinweisen, Ansprechpartner und Notiz), jede Wiedervorlage als offene
Aufgabe mit Fälligkeit. Das Cockpit legt nur Aufgaben an und ändert keine anderen Daten.
Ein Postausgang im Browser hält Einträge, bis sie übertragen sind, und versucht es beim
nächsten Start erneut; Status je Eintrag: In Salesforce, Wird übertragen, Fehler, Salesforce
nicht verbunden. Mit Demo-Daten wird die Übertragung nur simuliert.

Die Serverfunktion `api/salesforce.ts` (lokal über den Vite-Server) meldet sich per OAuth
Client Credentials an einer Connected App an. Zugangsdaten nur serverseitig:
`SALESFORCE_SYNC_ENABLED`, `SALESFORCE_LOGIN_URL`, `SALESFORCE_CLIENT_ID`,
`SALESFORCE_CLIENT_SECRET` (siehe `.env.example`). Erst einschalten, wenn die echte
Anmeldung (Entra ID) und der Zugriffsschutz der Vercel-Umgebung stehen; sonst könnte jeder
mit dem Link Aufgaben anlegen.

Im Gespräch gewonnene Kontaktdaten (Name, Funktion, Durchwahl, E-Mail) werden im Briefing
unter „Neu erfasster Kontakt“ gespeichert. Das Dashboard exportiert sie als eigene CSV mit
der Lead-ID als Schlüssel, damit sie per Import zurück an den Lead in Salesforce gehen;
zusätzlich stehen sie als Ansprechpartner im Anrufprotokoll, ohne einen Kontakt anzulegen.
Salesforce bleibt das führende System, das Cockpit hält nichts dauerhaft.

Anrufergebnisse, Kontakte, Wiedervorlagen und der Postausgang liegen in der IndexedDB des Browsers und überstehen einen
Reload. Sie gelten nur für diesen Browser auf diesem Rechner. Vor dem Leeren der
Browserdaten exportieren.

## Demo-Ablauf

Für Vorführungen in den Fachbereichen. Alle Daten und Konten sind erfunden.

Die App startet mit einer simulierten Anmeldung per Single Sign-on. Es werden keine
Zugangsdaten abgefragt. Nach „Mit Firmenkonto anmelden (SSO)“ wird ein Konto gewählt,
die Rolle bestimmt die Ansicht:

| Konto            | Rolle                      | Ansicht                                         |
| ---------------- | -------------------------- | ----------------------------------------------- |
| Nele Faber       | Telefonassistenz           | Anrufliste, Termine, Wiedervorlagen             |
| Martina Weidmann | Teamleitung                | Team Nord: Team, Hunter, Termine, Einstellungen |
| Steffen Sixthor  | Head of Sales New Business | Vertriebsgebiet Nordwest: Regionen Nord und NRW |

Rollenwechsel über „Abmelden“ oben rechts. Die Anmeldung gilt je Browser-Tab und bleibt
beim Neuladen bestehen.

1. Vorher als Nele Faber anmelden und im Reiter Dashboard „Löschen“ wählen, damit Anrufe
   und Termine bei null starten. Abmelden.
2. Als Steffen Sixthor anmelden: Vertriebsgebiet Nordwest gesamt, Regionen Nord und NRW im
   Vergleich, Klick auf eine Region zeigt ihre Rangliste, rechts die größten Lücken.
3. Abmelden, als Nele Faber anmelden: Die Anrufliste startet mit der Leadliste ihres
   Hunters (Auswahl „Hunter“), sortiert nach Score, mit letzter Aktivität; Accounts mit
   Aktivität in den letzten 14 Tagen sind gesperrt, Briefing mit Aufhängern und persönlichem
   Einstiegssatz. Unten das Gesprächsprotokoll ausfüllen, dann „Termin vereinbaren“
   (Taste 1, öffnet den Salesforce-Kalender) oder Taste 2 für eine Wiedervorlage mit
   Datum. Der Reiter Wiedervorlagen zeigt mit Demo-Daten auch Wiedervorlagen aus früheren
   Anrufen, jede mit Status in Salesforce.
4. Abmelden, als Martina Weidmann anmelden: oben Termine heute, Termine diese Woche,
   Anrufe heute und Wochenziel, darunter ein Bereich mit den Ansichten Team, Hunter,
   Termine und Gespräche. Team zeigt je Person Hunter, Termine heute und der Woche und
   Anrufe; ein Klick öffnet rechts Werdegang und das Auswahlfeld „Arbeitet für Hunter“.
   Termine zeigt heute oder die Woche mit Status in Salesforce, die Kachel „Termine heute“
   springt dorthin. Gespräche listet je Firma das jüngste Protokoll, filterbar nach
   aktueller Lösung und Wettbewerber, mit Nettokontakten und CSV-Export, etwa alle Firmen
   bei MEWA für die gezielte Ansprache.
5. Als Steffen Sixthor: dieselben Bausteine je Region, dazu der Regionsvergleich.

Die erfassten Ergebnisse liegen nur im jeweiligen Browser. Jede Person, die den Link
öffnet, startet mit eigenem Stand.

## Struktur

```
src/
  app/            App-Shell, Reiter, Store, Selektoren
  components/     wiederverwendbare UI-Bausteine
  features/
    queue/        Anrufliste, Briefing, Ergebniserfassung
    map/          Karte der Potenzialliste
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
