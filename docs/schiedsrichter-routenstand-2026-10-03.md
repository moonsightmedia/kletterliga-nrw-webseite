# Teilnehmerstand an den Halbfinalrouten

Die vorhandene Schiedsrichteransicht zeigt pro physischer Route die tatsächlich zugeordneten Halbfinalklassen und aggregierte Teilnehmerzahlen. Routenuhren, QR-Ansicht und QR-Dialog verwenden dieselbe Anzeige. Nachladen alle zehn Sekunden baut weder QR-Bilder neu auf noch setzt es Uhren zurück; parallele Hintergrundabrufe werden unterdrückt.

## Zählung

Teilnehmer benötigen Halbfinalzulassung, aktive Eventanmeldung und ein aktiviertes, nicht archiviertes Teilnehmerprofil. Nicht erschienene, zurückgezogene und als nicht gestartet dokumentierte Personen werden ausgeschlossen. Personen ohne Crew-Check-in zählen weiterhin als offen und werden separat ausgewiesen. Nachmeldungen, Absagen und Einlassänderungen werden beim nächsten Abruf berücksichtigt.

Ein bestätigtes Routenergebnis, einschließlich 0 Punkten, oder eine explizite Klärung in `competition_semifinal_settlements` erledigt ausschließlich diese Route. Klassen ohne Teilnehmer bleiben sichtbar. Unzugeordnete Routen zeigen keine Klasse und null Teilnehmer. Die Anzeige bildet offene Einträge ab, keine physische Warteschlange.

## Rechte und Datenbank

Migration `20261003110000_judge_route_progress.sql` erweitert ausschließlich das bestehende RPC `get_competition_judge_routes`. Passwortformat und Hashprüfung bleiben erhalten und werden vor der bestehenden Fristprüfung ausgeführt. Es werden keine Teilnehmernamen, Kontakt- oder Kontodaten ergänzt; Zugriffe auf Anwesenheit und private Tabellen werden nicht erweitert. Berechtigungen bleiben identisch. Die vorherige Funktionsdefinition wurde außerhalb von Git gesichert. Produktive Installation und Migrationshistorie wurden innerhalb einer Transaktion durchgeführt; ein Hashvergleich schützt vor Überschreiben einer zwischenzeitlich geänderten Funktion. Keine Ergebnis-, Anmeldungs- oder Routeneinstellungen wurden durch die Migration geändert.

## Verifikation

- 11 SQL-Szenarien auf isolierter PostgreSQL-Datenbank mit tatsächlichem Schema und synthetischen Auth-Helfern: gemeinsame Routen, Nullwert, Nichtversuch, falsche Route, leere Klasse, nicht zugeordnete Route, Nachmeldung, Absage, Datenschutz, ungültiger Zugang und automatische Fristsperre.
- 15 Schiedsrichter-Komponententests: Klassen und Zahlen in Uhr/QR, Zehn-Sekunden-Aktualisierung ohne Uhrenreset, Netzfehler mit veraltetem Stand sowie bisherige Zugangssperren und Uhrenfunktionen.
- Gesamtsuite, Produktionsbuild und gezielter ESLint geprüft. Der App-Typecheck meldet weiterhin die 15 bereits bestehenden Fehler außerhalb der Änderung.
- Tatsächlich gerenderte Ansicht mit ausdrücklich erfundenen Zahlen bei 390 × 844, 768 × 1024 und 1440 × 900 geprüft; kein horizontaler Überlauf, mobile QR-Ansicht und fortlaufende Uhr. Entwicklungsdaten und Vorschauzugang sind im Produktionsbundle ausgeschlossen.
- Produktive Funktionsdefinition, Migrationshistorie, unveränderte Ausführungsrechte und Ablehnung eines ungültigen Zugangscodes verifiziert. Live-Aggregate mit aktuellen Routen/Klassen lesend geprüft; keine echten Zugangscodes abgerufen oder dokumentiert.

Nach Veröffentlichung die Schiedsrichteransicht einmal neu laden. Ein bereits offener Browser erhält neue Programmfunktionen erst nach dieser Aktualisierung. Der bestehende Zugang wird weiterverwendet. Die Gesamt-Generalprobe mit echten Geräten bleibt eine separate Vor-Ort-Abnahme.
