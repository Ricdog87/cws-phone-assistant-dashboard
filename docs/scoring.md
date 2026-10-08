# Scoring-Regeln

Dieses Dokument beschreibt die Regeln in Prosa, damit Vertrieb und Fachbereich sie ohne
Quelltext prüfen können. Umsetzung: `src/domain/scoring.ts`,
`src/domain/sampling.ts`, `src/domain/queue.ts`.

## 1. Keine Routenplanung im New Business

Entscheidung vom 08.10.2026: Im New Business ist die Routenplanung wenig sinnvoll. Die
Telefonassistenz arbeitet die Potenzialliste eines Hunters ab (Accountinhaber in
Salesforce), nicht die Umgebung einer Servicetour. Die frühere Dimension „Nähe“ und der
Korridor entfallen. Fit, Potenzial und Erreichbarkeit behalten ihre Regeln und ihr
Gewichtsverhältnis.

## 2. Die drei Dimensionen

Jede Dimension liegt zwischen 0 und 100.

**Fit** misst, wie gut Branche und Betriebsgröße passen.
Fit = Branchengrundwert × Größenfaktor, höchstens 100.

| Gewerbliche Mitarbeitende  | Größenfaktor |
| -------------------------- | ------------ |
| 40 bis 250                 | 1,00         |
| 20 bis 39 oder 251 bis 399 | 0,85         |
| alle anderen               | 0,60         |

Die Grundwerte je Branche stehen in `src/domain/branchen.json`. Sie sind vorläufig und vom Vertrieb zu bestätigen. `npm run export:branchen` schreibt sie nach `export/branchengrundwerte.csv`.

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

Die drei Gewichte sind im Reiter Scoring zwischen 0 und 50 einstellbar. Standard:
Fit 30, Potenzial 25, Erreichbarkeit 15. Die Gewichte werden auf die Summe 100 normiert,
es zählt also nur ihr Verhältnis zueinander (rund 43 : 36 : 21).

> Score = gerundete Summe aus Dimension × normiertes Gewicht ÷ 100

| Band | Score     |
| ---- | --------- |
| A    | ab 78     |
| B    | 58 bis 77 |
| C    | unter 58  |

## 4. Potenzialliste und Warteschlange

In die Warteschlange kommen alle Neukunden-Accounts der gewählten Potenzialliste: ein
Hunter (Accountinhaber) oder alle Hunter. Bestandskunden kommen nie in die Warteschlange
und stehen auf der Karte in eigener Farbe. Die letzte Aktivität aus Salesforce wird je
Account angezeigt, beeinflusst die Reihenfolge aber nicht. Eine Sperrfrist nach der
letzten Aktivität ist eine fachliche Entscheidung und noch offen.

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

## 6. Kalibrierung

Umsetzung: `src/domain/calibration.ts`, Anzeige im Reiter Scoring.

**Was ausgewertet wird.** Alle erfassten Anrufergebnisse. Jedes Ergebnis enthält die vier
Dimensionswerte zum Zeitpunkt des Anrufs. Angezeigt werden die tatsächliche Terminquote je
Band und je Dimension, Letztere getrennt nach den Wertebereichen 0–25, 25–50, 50–75 und
75–100.

**Wann ein Vorschlag entsteht.** Ab 300 erfassten Anrufen. Zusätzlich müssen Anrufe mit
und ohne Termin vorliegen, sonst ist keine Schätzung möglich.

**Wie der Vorschlag entsteht.**

1. Logistische Regression: Zielgröße „Termin vereinbart“ (1) gegen alle anderen Ergebnisse
   (0), Einflussgrößen die vier Dimensionen auf 0 bis 1 skaliert. Schätzung per
   Newton-Verfahren mit leichter L2-Regularisierung (λ = 1), damit einzelne Ausreißer den
   Vorschlag nicht kippen.
2. Die vorgeschlagenen Gewichte sind proportional zu den positiven Koeffizienten, normiert
   auf Summe 100. Damit sortiert der gewichtete Score die Leads genau so wie das Modell.
3. Dimensionen mit negativem Koeffizienten erhalten Gewicht 0, weil der Score keine Abzüge
   kennt. Wirkt keine Dimension positiv, gibt es keinen Vorschlag.
4. Für die Regler wird das größte Gewicht auf 50 gesetzt, die übrigen im selben Verhältnis.

**Entscheidungshilfe.** Je Dimension werden Koeffizient und Standardfehler angezeigt.
„Unsicher“ heißt, der Effekt ist kleiner als zwei Standardfehler. Die Trennschärfe (AUC)
vergleicht aktuelle und vorgeschlagene Gewichte auf denselben Anrufen. Da der Vorschlag
aus genau diesen Daten stammt, fällt der Vergleich eher zu günstig für den Vorschlag aus.

**Übernahme.** Der Vorschlag greift nie automatisch. Er wird erst nach „Vorschlag
übernehmen“ und „Bestätigen“ gesetzt und lässt sich über „Standard“ zurücknehmen.

**Warum die Kontrollstichprobe hier zählt.** Ohne sie liegen fast nur Ergebnisse aus Band A
vor, die Regression sieht kaum schwache Leads und überschätzt die heutigen Gewichte. Der
Anteil der Kontrollanrufe wird deshalb mit angezeigt.

## 7. Offene Abstimmungspunkte

Der Einzeldatei-Prototyp lag bei der Umsetzung nicht vor. Die folgenden Punkte sind daher
als Annahme umgesetzt und mit dem Prototyp beziehungsweise dem Fachbereich abzugleichen:

1. **Branchengrundwerte** (`src/domain/branchen.json`): Werte sind Platzhalter und vom
   Vertrieb zu bestätigen. Unbekannte Branchen erhalten 50.
2. **Sperrfrist nach letzter Aktivität**: Ob und wie lange ein kürzlich kontaktierter
   Account nicht angerufen wird, legt die Teamleitung fest.
3. **Alle Gewichte auf null**: Dann werden alle drei Dimensionen gleich gewichtet.
4. **Rundung der Stichprobengröße**: kaufmännisch, damit entfällt die Stichprobe bei
   Warteschlangen unter 7 Leads.
5. **Seed** der Stichprobe: 20240611.
6. **Briefing-Texte** (`src/domain/briefing.ts`): Formulierungen der Aufhänger und des
   Einstiegssatzes.
7. **Zielgröße der Kalibrierung**: Wiedervorlagen zählen als „kein Termin“, auch wenn
   daraus später ein Termin wird. „Nicht erreicht“ zählt ebenfalls mit, weil die
   Erreichbarkeit Teil des Scores ist. Alternative: nur erreichte Gespräche auswerten.
8. **Regularisierung** (λ = 1) und die Mindestmenge von 300 Anrufen.
9. **Telefonassistenz-Ziele** (`src/domain/agentGoals.ts`): Standard 75 Anrufe/Tag und
   4 Termine/Woche sowie die Motivationsformulierungen der Live-Maske.
