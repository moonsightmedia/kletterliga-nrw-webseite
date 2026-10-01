# Wettkampfzentrale · Bedienung am 3. Oktober 2026

## Vor dem Einlass

1. René meldet sich mit seinem eigenen Liga-Admin-Konto an und öffnet `/app/admin/league/wettkampf`.
2. Unter **Halbfinale** werden die fünf Routen jeder Klasse geprüft und die Ergebniseingabe geöffnet. Die vorhandenen Schiedsrichter-QRs und lokalen Uhren bleiben unter `/app/schiedsrichter`.
3. Unter **Finalstartlisten** die physischen Finalrouten mit letzter Griffnummer anlegen. Unter **Finale** für Station 1 und 2 jeweils einen eigenen 24-stelligen Code erzeugen. Der Code erscheint nur unmittelbar nach Erzeugung; bei Verlust einen neuen erzeugen und den alten dadurch widerrufen.
4. Der TV-Browser öffnet `/live/2026` ohne Anmeldung. In **Anzeige & Hinweise** Phase, Klassenrotation und optional eine fixierte Klasse wählen. Alle Seiten einer Klasse laufen vor der nächsten Klasse durch; eine fixierte Klasse blättert weiter durch ihre Seiten. Für Hinweise Titel, Text, Ziel und Anzeigedauer festlegen. Vollbildhinweise verschwinden nach Ablauf und die Rotation setzt fort, auch wenn inzwischen die Verbindung ausgefallen ist.

## Übergang vom Halbfinale

1. Halbfinaleingabe schließen. Für jede Klasse fehlende Routeneinträge anhand der Papierunterlagen nachtragen oder begründet als **nicht geklettert, 0 Punkte** bestätigen.
2. Bei Absage oder Nichterscheinen eine Begründung eintragen und den Status setzen. Vor dem Klassenstart kann dadurch nachgerückt werden.
3. Je Klasse Route und digitale Station auswählen. **Finalfeld bestätigen** friert Halbfinalplatz und Punkte ein und erstellt die umgekehrte Startreihenfolge. Alle Punktgleichen an der Grenze zum sechsten Platz werden einbezogen.
4. Startreihenfolge bei Bedarf mit den Pfeilen verschieben. Danach die Liste aus **Finalstartlisten** drucken. Nach einer Änderung die neue Version erneut drucken.
5. Die zwei Zeitnehmenden öffnen `/app/schiedsrichter/finale`, wählen ihre Station und geben ihren eigenen Code ein. Die zwei weiteren Schiedsrichter erhalten die Papierlisten.

## Finale und Papierabgleich

1. René startet jede Klasse einzeln in **Finale**. Erst dann kann die zuständige Station digital speichern.
2. Der Stationsablauf lautet **Klasse → Person → Griff oder TOP → Minuten/Sekunden → prüfen → speichern**. Die Zeit wird von der Stoppuhr beziehungsweise Papierliste übernommen, nicht aus der Browser-Uhr. Das System zeigt gespeicherte Werte sofort als vorläufige Live-Wertung.
3. Bei Korrekturen ist eine Begründung Pflicht. Ein technischer Zwischenfall wird von René als solcher markiert; nach Entscheidung setzt er den Status wieder auf „werten“, damit die Station einen neuen Versuch mit Begründung erfasst. Der alte Versuch bleibt im Protokoll.
4. Nach dem letzten Start schließt René die Klasseneingabe und gleicht jeden Eintrag mit der Papierliste ab. Nichterschienene werden eigens als DNS geklärt. Erst wenn kein offener Eintrag und kein technischer Zwischenfall verbleibt, wird die Klasse endgültig freigegeben.
5. Unter **Finale** gibt es die offizielle Druckliste und den CSV-Export. Bis zur Freigabe tragen beide die Kennzeichnung **vorläufig**.

## Wenn Internet oder ein Gerät ausfällt

- Auf Papier weiterschreiben und die Stoppzeit in ganzen Sekunden festhalten. Ein Stationsentwurf wird lokal gehalten, ist aber erst nach bestätigtem Speichern online.
- Nach Wiederverbindung die Klasse neu laden, den letzten gespeicherten Stand prüfen und den Entwurf bewusst erneut senden. Dieselbe Anfrage-ID wird nur einmal gewertet.
- Zeigt der TV **Verbindung unterbrochen**, steht noch der letzte erfolgreich geladene Stand. Ohne bisherigen Stand steht ausdrücklich **Ergebnisse nicht verfügbar**.
- Muss nach der endgültigen Freigabe korrigiert werden, hebt René die Freigabe mit Begründung auf, öffnet die Eingabe erneut und führt Papierabgleich und Freigabe nochmals durch.

## Technische Freigabe

Die Migrationen `20260930180000_competition_final_center.sql` und `20261001090000_competition_live_public_guard.sql` müssen vor dem Frontend ausgerollt werden. Die zweite Migration hält den Vorbereitungsstatus privat und erlaubt das begründete Wiederöffnen einer bereits gestarteten Klasse nach Halbfinalkorrekturen bei unverändert eingefrorenen Halbfinalplätzen. Danach den SQL-Test auf einer isolierten Datenbank ausführen und mit zwei getrennten Stationsgeräten, Admin-Konto, TV-Browser und echten A4-Ausdrucken einen vollständigen Durchlauf auf Testdaten machen. Renés persönlicher Liga-Admin-Zugang, die tatsächliche TV-URL und der Hallendrucker müssen am Gerät vor Ort geprüft werden.
