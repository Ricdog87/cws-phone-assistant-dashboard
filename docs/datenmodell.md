# Datenmodell

## Lead

Zentrales Modell aller Quellen, definiert in `src/domain/types.ts`.

| Feld                  | Typ            | Bedeutung                                       | Pflicht |
| --------------------- | -------------- | ----------------------------------------------- | ------- |
| `id`                  | Text           | Eindeutige ID aus der Quelle                    | ja      |
| `name`                | Text           | Firmenname                                      | ja      |
| `industry`            | Text           | Branchenschlüssel, siehe `INDUSTRY_BASE_SCORES` | nein    |
| `street`              | Text           | Straße und Hausnummer                           | nein    |
| `postalCode`          | Text           | PLZ                                             | nein    |
| `city`                | Text           | Ort                                             | nein    |
| `lat`, `lng`          | Zahl           | Koordinaten WGS84                               | ja      |
| `commercialEmployees` | Zahl           | Gewerbliche Mitarbeitende                       | nein    |
| `wearerCount`         | Zahl           | Träger von Berufskleidung                       | nein    |
| `phone`               | Text           | Telefonnummer                                   | nein    |
| `hasDirectDial`       | ja/nein        | Durchwahl zum Entscheider bekannt               | nein    |
| `contactName`         | Text oder leer | Ansprechpartner                                 | nein    |
| `contactRole`         | Text oder leer | Funktion des Ansprechpartners                   | nein    |
| `openPositions`       | Zahl           | Offene gewerbliche Stellen                      | nein    |
| `certification`       | Text oder leer | z. B. IFS Food, ISO 22000                       | nein    |
| `siteExpansion`       | ja/nein        | Standorterweiterung angekündigt                 | nein    |
| `managementChange`    | ja/nein        | Wechsel in der Geschäftsführung                 | nein    |
| `isCustomer`          | ja/nein        | Bestandskunde                                   | nein    |

## Validierung beim CSV-Import

Jede Zeile wird mit einem Zod-Schema geprüft (`src/data/csvImport.ts`). Eine Zeile kann
mehrere Fehler haben, alle erscheinen in der Fehlerliste mit Zeilennummer (Kopfzeile = 1),
Feld, Wert und Grund.

| Regel                                                                   | Folge                        |
| ----------------------------------------------------------------------- | ---------------------------- |
| Firmenname leer                                                         | Zeile fehlerhaft             |
| Zahl nicht lesbar                                                       | Zeile fehlerhaft             |
| Mitarbeitende, Träger, offene Stellen negativ oder mit Nachkommastellen | Zeile fehlerhaft             |
| Breitengrad außerhalb ±90, Längengrad außerhalb ±180                    | Zeile fehlerhaft             |
| Ja/Nein-Feld mit unbekanntem Wert                                       | Zeile fehlerhaft             |
| ID doppelt                                                              | spätere Zeile fehlerhaft     |
| Keine Koordinaten, aber Ort oder PLZ                                    | wird nachgeschlagen          |
| Keine Koordinaten und keine Adresse                                     | geladen, ohne Kartenposition |
| Adresse nicht gefunden                                                  | geladen, ohne Kartenposition |

Leere Zahlenfelder zählen als 0, leere Ja/Nein-Felder als nein. Koordinaten 0/0 gelten
als fehlend. Ja-Werte: ja, j, x, 1, true, wahr, yes, y. Nein-Werte: nein, n, 0, false,
falsch, no, -.

## CallOutcome

Jedes erfasste Anrufergebnis speichert den Zustand zum Zeitpunkt des Anrufs. Damit bleiben
die Trainingsdaten gültig, auch wenn sich Gewichte oder Stammdaten später ändern.

| Feld                 | Bedeutung                                                  |
| -------------------- | ---------------------------------------------------------- |
| `id`                 | Zufällige ID                                               |
| `leadId`, `leadName` | Bezug zum Lead                                             |
| `outcome`            | `appointment`, `callback`, `not_reached`, `not_interested` |
| `recordedAt`         | Zeitpunkt, ISO 8601                                        |
| `band`, `score`      | Band und Score beim Anruf                                  |
| `dimensions`         | Die drei Dimensionswerte (ältere Ergebnisse auch Nähe)     |
| `normalizedWeights`  | Normierte Gewichte beim Anruf                              |
| `owner`              | Hunter (Accountinhaber) des Leads beim Anruf               |
| `isControl`          | Teil der Kontrollstichprobe                                |
| `queuePosition`      | Position in der Warteschlange                              |
| `sourceId`           | Datenquelle                                                |
| `recallReason`       | Bei Wiedervorlage: `callback` oder `contractEnd`           |
| `protocol`           | Gesprächsprotokoll, siehe unten                            |

Ablage in IndexedDB (Datenbank `cws-lead-cockpit`, Tabelle `outcomes`). Export im
Dashboard als CSV mit Semikolon, Dezimalkomma und BOM, mit den Spalten des Protokolls.

## Gesprächsprotokoll

`CallProtocol` in `src/domain/types.ts`, erfasst unter dem Briefing. „Protokoll speichern“
legt es als offenes Gespräch ab, das Ergebnis übernimmt es in den `CallOutcome`.

| Feld               | Werte                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| `contactRole`      | Entscheider, Zentrale, Sonstige; Entscheider zählt als Nettokontakt     |
| `solution`         | Kauft Berufskleidung, Mitarbeitende kaufen selbst, Wettbewerb, keine BK |
| `competitor`       | Nur bei Wettbewerb: MEWA, Bardusch, DBL, Alsco, Sonstiger, Unbekannt    |
| `contractEnd`      | Nur bei Wettbewerb: Vertrag läuft bis, YYYY-MM; leer, wenn unbekannt    |
| `companyDissolved` | Firma erloschen                                                         |
| `centralDecision`  | Zentralentscheidung                                                     |
| `existingCustomer` | Bestandskunde                                                           |
| `doNotCall`        | Nicht mehr anrufen                                                      |
| `note`             | Notiz zum Telefonat, höchstens 500 Zeichen, ohne private Angaben        |

Die Liste der Lösungen und Wettbewerber kommt aus dem Vertrieb (Stand 08.10.2026).
Nachgefasst wird ab dem ersten Werktag neun Monate vor Vertragsende
(`contractFollowUpDate`), dieselbe Regel wie bei der Wiedervorlage. Ältere Protokolle ohne
Vertragsende gelten als unbekannt.

## Offenes Gespräch

`OpenCall` in `src/domain/types.ts`, Tabelle `openCalls` ab Datenbankversion 8: ein
gespeichertes Protokoll, dem noch das Ergebnis fehlt, je Lead höchstens eines.

| Feld                 | Bedeutung                                   |
| -------------------- | ------------------------------------------- |
| `id`                 | Zufällige ID, später die ID des Ergebnisses |
| `leadId`, `leadName` | Bezug zum Lead                              |
| `owner`              | Hunter (Accountinhaber) beim Speichern      |
| `protocol`           | Gesprächsprotokoll                          |
| `savedAt`            | Zuletzt gespeichert, ISO 8601               |

Mit dem Ergebnis wird das offene Gespräch geschlossen; das Ergebnis trägt seine ID, damit
die Aufgabe in Salesforce dieselbe bleibt.

## Wiedervorlage

Entsteht zusammen mit dem Ergebnis „Wiedervorlage“ und trägt denselben Zeitpunkt
(`Recall` in `src/domain/types.ts`, Tabelle `recalls` ab Datenbankversion 6). Die Aufgabe
selbst liegt in Salesforce.

| Feld                 | Bedeutung                                                |
| -------------------- | -------------------------------------------------------- |
| `id`                 | Zufällige ID                                             |
| `leadId`, `leadName` | Bezug zum Lead                                           |
| `hunterName`         | Accountinhaber beim Anlegen                              |
| `reason`             | `callback` (Rückruf vereinbart) oder `contractEnd`       |
| `dueDate`            | Fällig am, YYYY-MM-DD                                    |
| `dueTime`            | Uhrzeit HH:MM, nur beim Rückruf, sonst leer              |
| `contractEnd`        | Vertragsende YYYY-MM, nur beim Grund Vertragsende        |
| `note`               | Notiz aus dem Gesprächsprotokoll                         |
| `createdAt`          | Zeitpunkt des Ergebnisses, das die Wiedervorlage anlegte |

Offen ist eine Wiedervorlage, bis zum Lead ein späteres Ergebnis erfasst ist. In Salesforce
wird sie zur Aufgabe (`Task`): Betreff „Wiedervorlage: Firma“, Fälligkeitsdatum
(`ActivityDate`), Bezug zum Lead oder Account und Beschreibung mit Grund, Uhrzeit, Hunter
und Notiz.

## Postausgang nach Salesforce

`SyncItem` in `src/domain/salesforceSync.ts`, Tabelle `syncItems` ab Datenbankversion 7
(die frühere Tabelle `appointments` entfällt). Je Gespräch und je Wiedervorlage ein
Eintrag mit derselben ID, der fertigen Aufgabe (`task`), Status (`pending`, `synced`,
`failed`, `notConnected`, `demo`), Zahl der Versuche und der ID der Aufgabe in Salesforce.
Wird ein übertragener Eintrag geändert, etwa weil das Protokoll erneut gespeichert oder das
Ergebnis gebucht wird, aktualisiert die nächste Übertragung dieselbe Aufgabe
(`PATCH /sobjects/Task/{id}`).

| Aufgabe in Salesforce | Anrufprotokoll                       | Wiedervorlage                       |
| --------------------- | ------------------------------------ | ----------------------------------- |
| `Subject`             | Anruf: Firma                         | Wiedervorlage: Firma                |
| `Status`              | Completed                            | Not Started                         |
| `TaskSubtype`         | Call                                 | Task                                |
| `ActivityDate`        | Tag des Anrufs                       | Fälligkeit                          |
| `CallDisposition`     | Ergebnis, leer solange es aussteht   | leer                                |
| `ReminderDateTime`    | leer                                 | bei Uhrzeit, mit `IsReminderSet`    |
| `Description`         | Ergebnis, Protokoll, Ansprechpartner | Grund, Uhrzeit, Notiz, Hunter       |
| `WhatId` / `WhoId`    | Account oder Lead der Salesforce-ID  | Account oder Lead der Salesforce-ID |

Für Auswertungen in Salesforce selbst braucht es Felder am Account, etwa
`Aktuelle_Loesung__c`, `Wettbewerber__c`, `Vertragsende_Wettbewerb__c` und die vier Häkchen; „Nicht mehr anrufen“
entspricht beim Lead dem Standardfeld `DoNotCall`. Das ist mit dem Salesforce-Team
abzustimmen.

## Feldzuordnung je Quelle

Die vollständigen Zuordnungen stehen als Konstanten in den Provider-Dateien und sind dort
kommentiert. Übersicht:

| Lead-Feld             | CSV (Vorschlag)           | Clay                     | Dun & Bradstreet                      | Salesforce (Lead)              |
| --------------------- | ------------------------- | ------------------------ | ------------------------------------- | ------------------------------ |
| `id`                  | ID                        | Clay Row ID              | `duns`                                | `Id`                           |
| `name`                | Firma                     | Company Name             | `primaryName`                         | `Company`                      |
| `industry`            | Branche                   | Industry                 | `primaryIndustryCode`                 | `Industry`                     |
| `street`              | Straße                    | Street                   | `primaryAddress.streetAddress.line1`  | `Street`                       |
| `postalCode`          | PLZ                       | Postal Code              | `primaryAddress.postalCode`           | `PostalCode`                   |
| `city`                | Ort                       | City                     | `primaryAddress.addressLocality.name` | `City`                         |
| `lat` / `lng`         | Breitengrad / Längengrad  | Latitude / Longitude     | `primaryAddress.latitude/longitude`   | `Latitude` / `Longitude`       |
| `commercialEmployees` | Gewerbliche Mitarbeitende | offen                    | offen                                 | `Gewerbliche_Mitarbeitende__c` |
| `wearerCount`         | Trägerzahl                | offen                    | offen                                 | `Traegerzahl__c`               |
| `phone`               | Telefon                   | Company Phone            | `telephone[0].telephoneNumber`        | `Phone`                        |
| `hasDirectDial`       | Durchwahl                 | Direct Phone             | nicht vorhanden                       | `Durchwahl_bekannt__c`         |
| `contactName`         | Ansprechpartner           | Contact Full Name        | offen                                 | `FirstName` + `LastName`       |
| `contactRole`         | Funktion                  | Contact Job Title        | offen                                 | `Title`                        |
| `openPositions`       | Offene Stellen            | Open Jobs Count          | nicht vorhanden                       | `Offene_Stellen__c`            |
| `certification`       | Zertifizierung            | offen                    | nicht vorhanden                       | `Zertifizierung__c`            |
| `siteExpansion`       | Standorterweiterung       | Signal Expansion         | nicht vorhanden                       | `Standorterweiterung__c`       |
| `managementChange`    | Wechsel Geschäftsführung  | Signal Leadership Change | offen                                 | `GF_Wechsel__c`                |
| `isCustomer`          | Bestandskunde             | aus CRM                  | aus CRM                               | offen, über Account            |
| `owner`               | Accountinhaber            | aus CRM                  | aus CRM                               | `Owner.Name`                   |
| `lastActivity`        | Letzte Aktivität          | aus CRM                  | aus CRM                               | `LastActivityDate`             |

Felder mit Endung `__c` sind benutzerdefinierte Salesforce-Felder und müssen angelegt werden.

## Offene Zuordnungsfragen

1. **Gewerbliche Mitarbeitende**: Clay und D&B liefern nur Gesamtmitarbeitende. Braucht es
   eine Quote je Branche, oder wird der Wert im CRM gepflegt?
2. **Trägerzahl**: Wie wird sie geschätzt, solange keine Angabe vorliegt? Vorschlag:
   feste Quote auf gewerbliche Mitarbeitende je Branche, fachlich festzulegen.
3. **Branchenschlüssel**: NACE Ebene 2 ist abgebildet (`src/domain/nace.ts`, siehe
   docs/scoring.md). Offen bleiben SIC (D&B) und Freitext ohne NACE-Code.
4. **Durchwahl**: Woran erkennen wir eine Durchwahl zum Entscheider? Kennzeichen im CRM
   oder Regel auf der Nummer?
5. **Bestandskunden**: Maßgeblich ist der Account mit aktivem Vertrag. Abgleich über
   Kundennummer, Domain oder Adresse?
6. **Zertifizierungen**: Keine der Quellen liefert sie strukturiert. Manuelle Pflege
   oder Anreicherung?
7. **Dubletten**: Reihenfolge der Quellen bei Konflikten (CRM vor D&B vor Clay?).

Bonitäts- und Zahlungsdaten sind bewusst ausgeschlossen. Das ist ein eigener
Governance-Fall.
