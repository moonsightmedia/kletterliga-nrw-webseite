# Einlass und Ablaufprüfung · 2. Oktober 2026

Der Einlass ergänzt die bestehende Eventanmeldung um eine ausdrückliche Anwesenheitsbestätigung. Bestehende aktive und zugelassene Liga-Teilnehmer können vor Ablauf der Halbfinalfrist nachgemeldet und eingecheckt werden. Es gibt keine automatische Zulassung neuer Konten. Ein separates Einlasspasswort erlaubt der Crew ausschließlich Einchecken und Nachmelden; René verwaltet Ausfälle, Korrekturen und den Wettkampf mit seinem bestehenden Liga-Admin-Konto.

## Prüfung

Drei Subagenten haben Einlass/Admin, Teilnehmer und serverseitige Rechte sowie den Halbfinal-/Finalablauf geprüft. Behobene Punkte: dokumentierte Nicht-Erschienene blockieren die Finalfreigabe nicht mehr und erscheinen nicht als reguläre Nullergebnisse in App/TV; echte Nullergebnisse und ungeklärte Einträge bleiben erhalten. Öffentliche Ranglisten unterstützen tatsächlich vorhandene freie Klassen. Druckköpfe zeigen Routenname und Eingabegerät. Die Finalergebnisansicht sichert die Rangsortierung ausdrücklich ab.

- Frontend-Gesamtsuite: 417 Tests in 91 Dateien bestanden; zusätzlich drei Zugangseinstellungsprüfungen bestanden.
- Produktionsbuild erfolgreich. Der App-Typecheck enthält ausschließlich bestehende Fehler außerhalb der geänderten Dateien; ein vollständiger Typecheck ist damit nicht grün.
- Frisches produktives Schema ohne Teilnehmerdaten auf isoliertem PostgreSQL 17 wiederhergestellt; ausschließlich die drei neuen Migrationen angewandt. 63 Einlass-/Ranglistenprüfungen und 64 bestehende Wettkampfprüfungen bestanden. Synthetische Auth-Helfer ersetzen hier keinen vollständigen GoTrue-/PostgREST-Gerätetest.
- Sechs Prüfungen mit zwei echten parallelen PostgreSQL-Verbindungen: Versionskonflikt, gleicher Request, einmaliger Audit/Version, Passwortrotation und Widerruf. Synthetische Daten wurden anschließend entfernt.
- Browser: Anwesenheit mit einem Klick, ausdrückliche Nachmeldung mit Klasse, serverbestätigte Erfolgsmeldung, 390-Pixel-Handybreite ohne horizontales Scrollen, begründeter Ausfall auf Tabletgröße. Screenshots enthalten ausschließlich erfundene Personen.
- Vor produktiven Migrationen verschlüsselter Public-Schema-/Datenbackup im lokalen QA-Backupordner, 45 Tabellen; Archiv lesbar, DPAPI-Entschlüsselung und Prüfsumme bestätigt. Ein anfänglicher CLI-Login-Rechtefehler wurde durch ausdrücklich verwendetes `--role=postgres` gelöst; der frische Schema-Dump wurde danach erfolgreich erstellt.

## Vor Ort

Renés tatsächlichen Login, Einlasspasswort auf den Crewgeräten, Halbfinalrouten je Klasse, Finalrouten mit maximalem Griff, Zuordnung vor Klassenstart, beide Final-Handys, den anonymen TV-Browser und echten Druck testen. Keine echten Passwörter oder Anwesenheiten werden durch die Auslieferung gesetzt. Aktuelle Vorbereitungseinstellungen und Teilnehmerdaten bleiben erhalten.

Bedienung: [Kurzanleitung mit Screenshots](kurzanleitung-finaltag-mit-screenshots.md). Migrationen: `20261002180000_competition_attendance.sql`, `20261002180100_final_absence_guard.sql`, `20261002180200_semifinal_absence_public.sql`.
