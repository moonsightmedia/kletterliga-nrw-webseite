# Saisonfeedback im Liga-Adminbereich

## Zugang

`/app/admin/league/season-feedback`, erreichbar über **Saison & Wertung → Saisonfeedback** und eine Kachel auf der Liga-Übersicht. Nur aktive Liga-Admins können Antworten abrufen. Die öffentliche Umfrage und deren Schreibweg bleiben unverändert.

## Inhalt

- Gesamtzahl der Einsendungen, Perspektiven, Teilnahmeabsicht 2027 und vertiefte Themen.
- Filter nach Perspektive, Thema und Teilnahmeabsicht; Freitextsuche (max. 200 Zeichen).
- Neueste Antworten zuerst; 20 Antworten je Seite; vollständige, beschriftete Einzelantworten für Fragebogenversionen 1–4.
- Originaltexte werden als Text, niemals als HTML gerendert. Keine Identitätszuordnung, keine automatische Bewertung, keine Bearbeitung oder Löschung.

Einsendungen sind **keine eindeutigen Personen**. Mehrfacheinsendungen bleiben erhalten. Die Überblickszahlen beziehen sich immer auf alle Einsendungen; die Filter begrenzen nur die Antwortliste. Themen können mehrfach gewählt werden. Bei älteren Versionen werden Themen aus ausgefüllten Feldern abgeleitet, und die damalige Perspektive „nicht teilgenommen“ ist allgemeiner als die V4-Perspektive „spät entdeckt“.

## Datenzugriff und Rollout

Die Migration `20261006170000_admin_season_feedback.sql` ergänzt ausschließlich die lesende RPC `admin_season_feedback_2026`. Sie prüft die Rolle aus der Datenbank und ein nicht archiviertes Profil. Kein direkter Tabellenzugriff für `anon` oder `authenticated`; kein Service-Role-Key im Frontend. Begrenzte Seitenlänge (max. 50), validierte Filter, stabile Sortierung nach Datum und ID, wörtliche statt Wildcard-Suche.

Vor Freigabe des Frontends die einzelne neue Migration im richtigen Supabase-Projekt anwenden und im Migrationsjournal erfassen. **Kein unkontrolliertes `db push` mit weiteren ausstehenden Migrationen.** Anschließend als aktiver Liga-Admin die echte Ansicht und als Nicht-Admin die Zugriffssperre prüfen. Diese Änderung wurde noch nicht produktiv aktiviert.

Rollback: Frontend auf den vorherigen Deploymentstand zurücksetzen; falls erforderlich ausschließlich `public.admin_season_feedback_2026(text,text,text,text,integer,integer)` entfernen. Die Umfragetabelle und bestehende Einsendungen werden nicht geändert.

## Verifikation am 06.10.2026

- Produktionsbuild erfolgreich; vollständige Testsuite: 99 Dateien, 481 Tests erfolgreich.
- ESLint für geänderte Implementierung und neue Tests: keine Fehler; zwei vorhandene Fast-Refresh-Warnungen in AppRoutes.
- Projektweiter Typecheck meldet Fehler in unveränderten Bestandsdateien, keine Fehler in den neuen Feedbackdateien. Er wird deshalb nicht als bestanden ausgewiesen.
- Browserprüfung bei 390, 768 und Desktopbreite; keine horizontale Überbreite. Themenfilter, Suche, leeres Ergebnis, Rücksetzen, vollständige Antwort und mobile Navigation geprüft.
- SQL-Test gegen die echte Datenstruktur in einer vollständig zurückgerollten Transaktion: 15 Einsendungen, Adminzugriff erfolgreich, anonymer Kontext/Teilnehmer/Hallen-Admin gesperrt, Tabellenzugriff gesperrt, Filter/Seitenbegrenzung geprüft. Eine separate Abfrage bestätigt, dass die Kandidatenfunktion nicht in Produktion verblieben ist.
- Lokale Oberfläche verwendet nur 3 erfundene Beispieldatensätze unter `/demo/saisonfeedback`. Diese Route und ihre Beispieldaten werden nicht in den Produktionsbuild aufgenommen. Echter Browser-End-to-End-Test mit Adminsession steht für den Rollout noch aus.

Kein Notioninhalt, keine Einsendung und keine produktive Website wurden mit diesem Change geändert. Es wurden keine Zugangsdaten in Dateien oder Logs abgelegt.
