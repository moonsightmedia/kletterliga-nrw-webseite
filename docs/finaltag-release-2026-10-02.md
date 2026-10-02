# Wettkampftag: Releaseprüfung vom 02.10.2026

Die Datenbankanbindung wurde produktiv eingerichtet. Der Frontendstand wird über PR #26 und die vorhandene GitHub-/Vercel-Anbindung veröffentlicht. Der endgültige Deploymentstatus wird im Notion-Task und im gerätespezifischen Handoff festgehalten.

## Geprüft

- Aktueller Hauptstand konfliktfrei integriert; 369 Frontendtests bestanden, Produktionsbuild erfolgreich. App-Typecheck: 15 bekannte Fehler außerhalb dieser Änderungen.
- Fünf Migrationen auf einer isolierten PostgreSQL-17-Datenbank mit dem echten öffentlichen Schema und synthetischer Authentifizierung ausgeführt. Drei SQL-Suites mit insgesamt 50 PASS-Meldungen bestanden. Dies ist keine vollständige GoTrue-/PostgREST-Geräteprobe.
- Geprüft wurden unter anderem Gleichstandsgrenze, gemeinsame Passwortanmeldung, Widerruf, Rechte, veraltete Änderungen, Wiederholung, Papierabgleich, Ausfälle, endgültige Freigabe, Wiederöffnung und Serverfrist.
- Vollständige Sicherung der bisherigen 34 öffentlichen Tabellen verschlüsselt mit Windows DPAPI im lokalen Kletterliga-QA-Backupordner. Entschlüsselung und Prüfsumme verifiziert. Vergleich unmittelbar nach den Migrationen: bisherige Tabelleninhalte unverändert.
- Alle fünf Migrationen produktiv eingespielt. Danach wurde ausschließlich Renés bestehendes Konto gezielt von Teilnehmer auf Liga-Admin umgestellt. Seine Admin-RPC liefert die echten Daten (80 Halbfinalteilnehmer); ein tatsächlicher Login mit seinem Passwort ist noch nicht geprüft.
- Veranstaltung weiterhin in Vorbereitung. Vorhanden: 14 Halbfinalrouten und 55 Klassenzuordnungen. Teilnehmerabgabe endet serverseitig am 03.10.2026 um 16:00 Uhr Europe/Berlin; begründete Admin-Nachträge bleiben möglich.

## Migrationen

1. 20261002100000_competition_final_center.sql
2. 20261002100100_competition_live_public_guard.sql
3. 20261002100200_semifinal_deadline.sql
4. 20261002100300_shared_final_password.sql
5. 20261002100400_semifinal_admin_workflow.sql

Neue Versionsnummern vermeiden die Kollision mit der bereits produktiven Saisonfeedback-Migration. Die bestehende Remote-Historie wurde nicht umgeschrieben.

## Vor Ort einrichten

René meldet sich unter /app/admin/league/wettkampf mit seinem persönlichen Konto an. Im Bereich Finalstartlisten kann er Finalrouten mit Namen und maximaler Griffnummer anlegen und den Klassen zuordnen. Eine physische Route kann mehrere Klassen bedienen. Vor dem jeweiligen Klassenstart müssen diese Angaben stimmen.

Das gemeinsame Finalpasswort richtet René selbst im Adminbereich ein. Beide Handys öffnen /app/schiedsrichter/finale und wählen Handy 1 beziehungsweise Handy 2. Zugangsdaten werden nicht in der Dokumentation gespeichert.

Der TV öffnet /live/2026 ohne Anmeldung. Vor Beginn bleibt die öffentliche Anzeige leer; René aktiviert die Halbfinaleingabe und wählt Halbfinale, Klassen und Wechselintervall unter Anzeige & Hinweise. Anschließend persönliches Login, beide Handys, TV-Browser und einen echten Ausdruck testen. Eine automatische Datenbankprobe ersetzt diese Gerätetests nicht.

Bei Internetausfall Papier verwenden. Nicht übertragene Entwürfe nach Wiederverbindung bewusst erneut senden. Bedienung: [Kurzanleitung mit Screenshots](kurzanleitung-finaltag-mit-screenshots.md).
