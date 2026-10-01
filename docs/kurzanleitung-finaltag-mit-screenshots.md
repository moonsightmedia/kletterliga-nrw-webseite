# Finaltag · Kurzanleitung für René und die Zeitnahme

Die Bilder zeigen die überarbeiteten **App-Oberflächen mit erfundenen Testdaten**. [Lokal ausprobieren](http://127.0.0.1:5337/demo/finaltag), solange der Entwicklungsserver läuft. Die Testdaten bleiben im Browser. **Testdaten zurücksetzen** stellt drei Klassen wieder her: Vorstieg U18 hat eine freigegebene Startliste, Vorstieg Ü18 läuft bereits und Toprope hat eine offene Halbfinalroute.

## 1. Über die Übersicht einsteigen

Unter **So geht es weiter** steht für jede Klasse der aktuelle Status, die nächste Aufgabe und deren Erklärung. **Klasse öffnen** führt direkt zur passenden Ansicht. In Halbfinale, Finalstartlisten und Finale lässt sich oben die **Klasse bearbeiten** wechseln. Der Fernseher läuft unabhängig davon.

![Übersicht mit konkretem nächsten Schritt je Klasse](screenshots/zentrale-demo.jpg)

## 2. Halbfinale verfolgen und Startliste drucken

Schiedsrichter kontrollieren das Ergebnis und zeigen den Routen-QR. Nach Scan und **Ergebnis absenden** zählt der bestätigte Eintrag sofort. René sieht die Klassenrangliste unter **Übersicht** oder **Halbfinale**; ein Klick auf den Namen zeigt alle fünf Routenergebnisse und ihre Eingabezeiten. Er bestätigt diese Ergebnisse nicht erneut. **0 Punkte** ist ein eingetragenes Ergebnis, **Noch nicht eingetragen** bleibt offen. Teilnehmer prüfen ihre eigenen Einträge.

![Halbfinalrangliste mit aufgeklappten Routenergebnissen: null und fehlend sind unterscheidbar](screenshots/halbfinale-rangliste-details.jpg)

Am **3. Oktober 2026 um 16:00 Uhr** sperrt die normale Abgabe automatisch. René kann anschließend im aufklappbaren Bereich **Fehlende Einträge nachtragen** mit Begründung nachtragen oder ausdrücklich als nicht geklettert mit null Punkten klären. In der lokalen Probe startet **Halbfinale ausprobieren** diesen Ablauf neu. **16-Uhr-Sperre testen** simuliert das Fristende; Robins fünfte Toprope-Route ist offen.

Wenn die fehlenden Einträge geklärt sind: **Finalfeld bestätigen**, Route und digitale Station auswählen, Vorschlag prüfen. Sechs Plätze plus Punktgleiche; weniger verfügbare Personen ziehen vollständig ein.

In **Finalstartlisten** stehen die Starts vom schlechtesten qualifizierten Halbfinalplatz zum besten. Pfeile ändern ausschließlich die Startfolge. Ausfälle vor Klassenstart begründet dokumentieren und das Feld erneut bestätigen. **Drucken** öffnet einen separaten Tab. Nach Änderungen gilt die neue Version: alten Ausdruck ersetzen.

![Versionierte Startliste und Nachrücker](screenshots/startlisten-demo.jpg)

![A4-Ansicht für handschriftliche Ergebnisse](screenshots/druckliste-demo.jpg)

## 3. Klasse starten und digital erfassen

In **Finale** aktuelle Startliste drucken und verteilen, dann **Klasse starten**. Erst danach ist die digitale Eingabe offen. Im aufklappbaren Bereich **Finalpasswort** legt René einmal ein gemeinsames Passwort für beide Handys fest (mindestens zwölf Zeichen). Ein neues Passwort ersetzt das alte auf beiden Handys.

Die Zeitnehmenden öffnen die **Finaleingabe**, wählen einmal **Handy 1** beziehungsweise **Handy 2** und geben dasselbe Finalpasswort ein. Beide sehen alle freigegebenen Klassen. Die Handynummer dient nur dem Protokoll. Im lokalen Probedurchlauf: **Finaleingabe öffnen**, das dort angezeigte Demo-Finalpasswort verwenden. Dieser Link erscheint nicht in der Halbfinalansicht. Vorstieg U18 auswählen, Nora Muster wählen und beispielsweise **Griff 24 · 3 Minuten · 12 Sekunden** eintragen. **Eintrag prüfen**, Zusammenfassung mit dem Papier vergleichen, **Jetzt speichern**. Ein Entwurf ist noch nicht übertragen; nur die bestätigte Speicherung erscheint online. Es gibt keine automatische Übernahme einer Browser-Stoppuhr.

![Anmeldung beider Handys mit gemeinsamem Finalpasswort](screenshots/finalpasswort-anmeldung.jpg)

## 4. Papierabgleich und Ergebnisfreigabe

René sieht gespeicherte Ergebnisse sofort in **Finale**. Jeden Wert mit dem Papier vergleichen und abgleichen. Nach dem letzten Start **Eingabe schließen**. **Endgültig freigeben** wird erst aktiv, wenn alle Starter ein geprüftes Ergebnis oder einen geklärten Ausfall haben. Technische Zwischenfälle müssen zuerst entschieden werden. Korrekturen brauchen eine Begründung; nach Freigabe zunächst begründet wieder öffnen und anschließend erneut prüfen.

Die Teilnehmer-Rangliste öffnet bei bestätigten Finaldaten direkt das **Finale**. Über den Klassenwähler wechselt man zwischen den Klassen; **Halbfinale** bleibt separat erreichbar. Rang, Startposition und Halbfinalplatz sind klar getrennt.

![Finalwertung in der Teilnehmeransicht auf dem Handy](screenshots/rangliste-mobil.jpg)

## 5. TV läuft automatisch

Im echten Betrieb öffnet der TV-Browser **`/live/2026` ohne Anmeldung**. René steuert den Bildschirm unter **Anzeige & Hinweise**. Halbfinale oder Finale wählen, gewünschte Klassen auswählen, Wechselintervall einstellen und **Anzeige speichern**. **Alle Klassen automatisch** nimmt alle Klassen auf. Alternativ eine Klasse fixieren.

Der TV zeigt acht Personen pro Seite. Er zeigt zuerst alle Seiten einer Klasse, dann die nächste Klasse. Die Klassen sind unten sichtbar. Standard: Wechsel alle 15 Sekunden, neue Werte alle fünf Sekunden. Auf dem TV stehen keine Verwaltungsbuttons. Bei Verbindungsproblemen bleibt der letzte Stand sichtbar und erhält eine Warnung.

![Öffentliche TV-Darstellung mit automatischer Klassenrotation](screenshots/tv-demo.jpg)

Hinweise erhalten Titel, Text, Ziel App/TV/beide und eine Anzeigedauer. Ein Vollbildhinweis pausiert die Rangliste. Nach Ablauf oder Rücknahme verschwindet er und die Rangliste läuft automatisch weiter. **Bis zur Rücknahme** bleibt dauerhaft sichtbar; für Zeitänderungen eine passende Dauer wählen. **TV öffnen** zeigt genau die Bildschirmansicht in einem separaten Tab.

## Zugänge und Ausfallverfahren

| Person/Gerät       | Echte Adresse                 | Zugang                                                     |
| ------------------ | ----------------------------- | ---------------------------------------------------------- |
| René               | `/app/admin/league/wettkampf` | Persönliches Liga-Admin-Konto                              |
| Beide Final-Handys | `/app/schiedsrichter/finale`  | Gemeinsames Finalpasswort, alle freigegebenen Finalklassen |
| Teilnehmer         | `/app/wettkampf/rangliste`    | Bestehender App-Zugang                                     |
| Fernseher          | `/live/2026`                  | Öffentlich, keine Anmeldung                                |

Bei Netzausfall auf Papier weiterarbeiten. Nach Wiederverbindung aktuellen Stand prüfen und den lokal erhaltenen Entwurf bewusst erneut senden. Eine unbestätigte Übertragung ist kein veröffentlichtes Ergebnis.

**Vor dem echten Event noch erforderlich:** Supabase-Anbindung, alle vier Wettkampfmigrationen einschließlich gemeinsamer Passwortanmeldung, SQL-Tests in isolierter Datenbank, Renés tatsächliches Konto, Einrichtung des echten Finalpassworts durch René und ein vollständiger Durchlauf mit zwei Geräten sowie echtem TV und Drucker. Die lokale Probe bestätigt die Bedienung, nicht produktive Datenbankrechte. Ausführlicher Ablauf: [Bedienung am Wettkampftag](finale-wettkampfzentrale-2026.md); vereinbarte Halbfinalregeln: [Halbfinale](halbfinale-bedienkonzept.md).
