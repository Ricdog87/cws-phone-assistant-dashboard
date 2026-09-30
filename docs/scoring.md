# Scoring-Regeln

Dieses Dokument beschreibt die Regeln in Prosa, damit Vertrieb und Fachbereich sie ohne
Quelltext prüfen können. Umsetzung: `src/domain/geo.ts`, `src/domain/scoring.ts`,
`src/domain/sampling.ts`, `src/domain/queue.ts`.

## 1. Abstand zur Route und Umweg

Die Serviceroute ist eine Linie aus Stützpunkten. Für jeden Lead wird der kleinste
Abstand zu allen Teilstücken dieser Linie berechnet. Den nächstgelegenen Punkt auf dem
Teilstück bestimmen wir in einer lokalen Projektion, bei der Längengrade mit dem Kosinus
des Breitengrads gestaucht werden. Die eigentliche Entfernung zu diesem Punkt misst die
Haversine-Formel als Luftlinie in Kilometern.

Aus dem Abstand ergibt sich der Umweg in Minuten:

> Umweg = (2 × Abstand ÷ 45 km/h × 60) + 2 Minuten, gerundet auf eine Nachkommastelle

Die 2 steht für Hin- und Rückweg, 45 km/h für die angenommene Durchschnittsgeschwindigkeit,
die 2 Minuten am Ende für den Aufwand je zusätzlichem Stopp. Beide Werte sind als
Konstanten hinterlegt (`AVERAGE_SPEED_KMH`, `STOP_OVERHEAD_MINUTES`).

## 2. Die vier Dimensionen

Jede Dimension liegt zwischen 0 und 100.

**Fit** misst, wie gut Branche und Betriebsgröße passen.
Fit = Branchengrundwert × Größenfaktor, höchstens 100.

| Gewerbliche Mitarbeitende  | Größenfaktor |
| -------------------------- | ------------ |
| 40 bis 250                 | 1,00         |
| 20 bis 39 oder 251 bis 399 | 0,85         |
| alle anderen               | 0,60         |

Die Grundwerte je Branche stehen in `src/domain/branchen.json`. Sie sind vorläufig und vom Vertrieb zu bestätigen. `npm run export:branchen` schreibt sie nach `export/branchengrundwerte.csv`.

**Nähe** misst, wie gut der Lead in die Route passt.
Nähe = 100 − (Umweg − 2) × 9, nicht unter 0. Ein Lead direkt an der Route (Umweg 2 Minuten)
erhält 100, ab rund 13 Minuten Umweg 0.

**Potenzial** misst das Volumen. Potenzial = Trägerzahl ÷ 2,2, höchstens 100.
Ab 220 Trägern ist das Potenzial voll ausgeschöpft.

**Erreichbarkeit** misst, wie wahrscheinlich ein Gespräch zustande kommt.

| Merkmal                         | Punkte                      |
| ------------------------------- | --------------------------- |
| Durchwahl bekannt               | 34                          |
| Ansprechpartner bekannt         | 26                          |
| Offene Stellen                  | 3,5 je Stelle, höchstens 22 |
| Zertifizierung vorhanden        | 6                           |
| Standorterweiterung             | 7                           |
| Wechsel in der Geschäftsführung | 5                           |

Die Summe wird auf 100 gedeckelt.

## 3. Gesamtscore und Bänder

Die vier Gewichte sind im Reiter Scoring zwischen 0 und 50 einstellbar. Standard:
Fit 30, Nähe 30, Potenzial 25, Erreichbarkeit 15. Die Gewichte werden auf die Summe 100
normiert, es zählt also nur ihr Verhältnis zueinander.

> Score = gerundete Summe aus Dimension × normiertes Gewicht ÷ 100

| Band | Score     |
| ---- | --------- |
| A    | ab 78     |
| B    | 58 bis 77 |
| C    | unter 58  |

## 4. Korridor

Nur Leads, deren Luftlinie zur Route höchstens der Korridorbreite entspricht, kommen in die
Warteschlange. Standard 2,0 km, einstellbar von 1 bis 10 km. Leads außerhalb bleiben auf
der Karte sichtbar, aber blass. Bestandskunden kommen nie in die Warteschlange und stehen
auf der Karte in eigener Farbe.

Die Warteschlange ist absteigend nach Score sortiert. Bei gleichem Score bleibt die
Reihenfolge der Datenquelle erhalten.

## 5. Kontrollstichprobe

8 Prozent der Warteschlange werden aus Leads der Bänder B und C gezogen, als „Kontrolle“
markiert und gleichmäßig über die Warteschlange verteilt eingestreut.

**Warum.** Ohne Stichprobe telefonieren die Assistenten fast nur Band A ab. Die erfassten
Ergebnisse stammen dann fast ausschließlich aus Leads, die das heutige Scoring bereits für
gut hält. Ein später trainiertes Modell sieht nie, wie B- und C-Leads tatsächlich
abschneiden, und bestätigt nur die bestehenden Annahmen (Selektionsfehler). Die
Kontrollstichprobe liefert einen kleinen, unverzerrten Vergleichswert und ist die
Voraussetzung dafür, dass eine spätere Kalibrierung überhaupt aussagekräftig ist.

**Wie.**

- Anzahl: 8 % der Warteschlangenlänge, kaufmännisch gerundet, höchstens so viele wie
  B- und C-Leads vorhanden sind. Bei 42 Leads also 3.
- Ziehung: Die Kandidaten werden nach ID sortiert und mit einem festen Seed
  (`CONTROL_SEED`) gemischt. Die Auswahl ist damit reproduzierbar und hängt nicht davon ab,
  in welcher Reihenfolge die Daten geladen wurden.
- Platzierung: Bei k Kontroll-Leads in einer Liste der Länge n liegen sie an den Positionen
  ⌊(j + 0,5) × n ÷ k⌋ für j = 0 … k − 1. Die übrigen Leads behalten ihre Score-Reihenfolge.
- Jedes Anrufergebnis speichert, ob der Lead Teil der Stichprobe war. Das Dashboard
  vergleicht beide Gruppen.

Die Stichprobe lässt sich im Reiter Scoring abschalten, etwa für Schulungen.

## 6. Offene Abstimmungspunkte

Der Einzeldatei-Prototyp lag bei der Umsetzung nicht vor. Die folgenden Punkte sind daher
als Annahme umgesetzt und mit dem Prototyp beziehungsweise dem Fachbereich abzugleichen:

1. **Branchengrundwerte** (`src/domain/branchen.json`): Werte sind Platzhalter und vom
   Vertrieb zu bestätigen. Unbekannte Branchen erhalten 50.
2. **Nähe auf gerundetem Umweg**: Die Nähe wird aus dem auf eine Nachkommastelle gerundeten
   Umweg berechnet.
3. **Alle Gewichte auf null**: Dann werden alle vier Dimensionen gleich gewichtet (je 25).
4. **Rundung der Stichprobengröße**: kaufmännisch, damit entfällt die Stichprobe bei
   Warteschlangen unter 7 Leads.
5. **Seed** der Stichprobe: 20240611.
6. **Briefing-Texte** (`src/domain/briefing.ts`): Formulierungen der Aufhänger und des
   Einstiegssatzes sowie die Grenze „an der Route“ (bis 5 Minuten Umweg).
