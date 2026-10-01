# Halbfinale: bestätigter Ablauf

Stand 01.10.2026, mit Janosch konkretisiert. Diese Regeln ersetzen für das Halbfinale den zuvor beschriebenen manuellen Abschluss um 16 Uhr.

## Teilnehmer und Schiedsrichter

1. Teilnehmer wählen unter **Meine Routen** ihren erreichten Griff, einschließlich **Kein Griff / 0 Punkte**.
2. Der Schiedsrichter kontrolliert das Ergebnis und zeigt den QR-Code der passenden Route.
3. Der Teilnehmer scannt den QR-Code und drückt **Ergebnis absenden**. Der Scan allein speichert noch nichts.
4. Erst die erfolgreiche Serverbestätigung gilt als abgegeben. Der gespeicherte Wert zählt sofort in der Halbfinalrangliste. René bestätigt ihn nicht erneut.
5. Teilnehmer prüfen ihre eigenen fünf Einträge. Ein gespeicherter Nullwert zählt als eingetragene Route; eine fehlende Route bleibt offen.

Die bestehende QR-Funktion prüft die Route und den gültigen Routencode. Die Kontrolle durch den Schiedsrichter erfolgt persönlich; der Scan ist keine separate digitale Unterschrift eines identifizierten Schiedsrichters.

## Renés Übersicht

Unter **Übersicht** und **Halbfinale** steht die Rangliste der gewählten Klasse. Der Name klappt die fünf Routenergebnisse auf: Punkte, Griff, Erstabgabe und gegebenenfalls letzte Korrektur. Die Vollständigkeit steht pro Person und Klasse dabei. Dies ist eine Leseansicht ohne zusätzliche Ergebnisfreigabe.

Die Daten werden alle fünf Sekunden aktualisiert. Fehlende Einträge und die administrativen Grundeinstellungen liegen in gesonderten aufklappbaren Bereichen. Erst nach Ende der normalen Eingabe werden fehlende Werte begründet nachgetragen oder ausdrücklich als nicht geklettert dokumentiert. Die Bestätigung des Finalfeldes bleibt ein eigener späterer Schritt.

## Automatische Sperre um 16 Uhr

Für den Wettkampftag **03.10.2026** endet die normale Ergebniseingabe exakt um **16:00 Uhr Europe/Berlin**, also **14:00 UTC**. Der Server prüft seine eigene Uhr in der Abgabe-RPC und unmittelbar vor dem Datenbankeintrag. Ein bereits offener Browser und wartende Anfragen umgehen die Grenze nicht. Die Teilnehmeroberfläche schließt Eingabemöglichkeiten und den QR-Scanner ebenfalls, sobald die bekannte Frist erreicht ist.

Der geschlossene Zustand wird bei der nächsten zulässigen Anfrage gespeichert; die Schreibsperre gilt unabhängig davon bereits ab der Frist. Dafür ist kein offener Admin-Browser und kein zeitgesteuerter Hintergrundjob erforderlich. Die bisher gültigen Ergebnisse bleiben erhalten.

René kann mit der vorhandenen Liga-Admin-Berechtigung weiterhin begründet nachtragen und korrigieren. Die normale Teilnehmerabgabe lässt sich nach Fristende nicht wieder öffnen. Änderungen bleiben protokolliert. Andere Saisons erhalten ohne ausdrücklich konfigurierte Frist keinen erfundenen Termin.

## Teilnehmer und TV

Verwaltung, Teilnehmer-Rangliste und öffentliche Anzeige verwenden dieselbe serverseitige Halbfinalwertung. Auf dem TV wird `/live/2026` ohne Anmeldung geöffnet. René konfiguriert **Halbfinale**, die gewünschten Klassen und das Wechselintervall unter **Anzeige & Hinweise**. Alle Seiten einer Klasse laufen durch, dann folgt die nächste Klasse. Standard: 15 Sekunden pro Seite, Datenabruf alle fünf Sekunden.

Die öffentliche Anzeige enthält keine Zugangscodes oder internen Korrekturbegründungen. Bei Verbindungsausfall bleibt der letzte Stand als veraltet gekennzeichnet. Nicht bestätigte Teilnehmerabgaben zählen nicht; nach 16 Uhr klärt René solche Fälle über den Nachtrag.

## Lokal ausprobieren und Freigabestand

Unter `/demo/finaltag` startet **Halbfinale ausprobieren** einen ausschließlich lokalen Test mit erfundenen Personen, offenen Halbfinalklassen und TV-Klassenrotation. In **Toprope · Ü18 offen** hat Robin zwei gespeicherte Nullwerte und eine fehlende fünfte Route. Ein Klick auf seinen Namen zeigt den Unterschied.

**16-Uhr-Sperre testen** verschiebt nur in diesen lokalen Testdaten die Frist in die Vergangenheit. Anschließend kann René die fehlende Route mit Begründung und Griff nachtragen. Die Teilnehmer-Rangliste zeigt denselben neuen Punktestand. **Halbfinale ausprobieren** setzt diesen Test wieder auf den Anfang zurück.

Die Migration `20261001120000_semifinal_deadline.sql` ist vorbereitet. `supabase/tests/semifinal_deadline.sql` prüft in einer rückgerollten Testtransaktion Nullwerte, die Zeitgrenze, verspätete Teilnehmerabgabe, Admin-Nachtrag, Protokoll und öffentliche Punkte. Mangels funktionierendem isoliertem Datenbankzugang wurde dieser SQL-Test lokal noch nicht ausgeführt. Die produktive Sperre darf erst nach Migration und Datenbankprüfung als eingerichtet gelten.
