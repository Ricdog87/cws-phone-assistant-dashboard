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

Datensätze ohne gültige Koordinaten werden verworfen und im Reiter Daten gezählt.

## CallOutcome

Jedes erfasste Anrufergebnis speichert den Zustand zum Zeitpunkt des Anrufs. Damit bleiben
die Trainingsdaten gültig, auch wenn sich Gewichte oder Stammdaten später ändern.

| Feld                          | Bedeutung                                                  |
| ----------------------------- | ---------------------------------------------------------- |
| `id`                          | Zufällige ID                                               |
| `leadId`, `leadName`          | Bezug zum Lead                                             |
| `outcome`                     | `appointment`, `callback`, `not_reached`, `not_interested` |
| `recordedAt`                  | Zeitpunkt, ISO 8601                                        |
| `band`, `score`               | Band und Score beim Anruf                                  |
| `dimensions`                  | Die vier Dimensionswerte                                   |
| `normalizedWeights`           | Normierte Gewichte beim Anruf                              |
| `distanceKm`, `detourMinutes` | Abstand und Umweg                                          |
| `isControl`                   | Teil der Kontrollstichprobe                                |
| `queuePosition`               | Position in der Warteschlange                              |
| `sourceId`                    | Datenquelle                                                |

Ablage in IndexedDB (Datenbank `cws-lead-cockpit`, Tabelle `outcomes`). Export im
Dashboard als CSV mit Semikolon, Dezimalkomma und BOM.

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

Felder mit Endung `__c` sind benutzerdefinierte Salesforce-Felder und müssen angelegt werden.

## Offene Zuordnungsfragen

1. **Gewerbliche Mitarbeitende**: Clay und D&B liefern nur Gesamtmitarbeitende. Braucht es
   eine Quote je Branche, oder wird der Wert im CRM gepflegt?
2. **Trägerzahl**: Wie wird sie geschätzt, solange keine Angabe vorliegt? Vorschlag:
   feste Quote auf gewerbliche Mitarbeitende je Branche, fachlich festzulegen.
3. **Branchenschlüssel**: Abbildung von SIC/NACE (D&B) und Freitext (Clay, Salesforce) auf
   die Schlüssel in `INDUSTRY_BASE_SCORES`.
4. **Durchwahl**: Woran erkennen wir eine Durchwahl zum Entscheider? Kennzeichen im CRM
   oder Regel auf der Nummer?
5. **Bestandskunden**: Maßgeblich ist der Account mit aktivem Vertrag. Abgleich über
   Kundennummer, Domain oder Adresse?
6. **Zertifizierungen**: Keine der Quellen liefert sie strukturiert. Manuelle Pflege
   oder Anreicherung?
7. **Dubletten**: Reihenfolge der Quellen bei Konflikten (CRM vor D&B vor Clay?).

Bonitäts- und Zahlungsdaten sind bewusst ausgeschlossen. Das ist ein eigener
Governance-Fall.
