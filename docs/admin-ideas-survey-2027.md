# Ideen 2027 im Liga-Adminbereich

Stand 15.10.2026: Veröffentlichung von Janosch ausdrücklich freigegeben. Die einzelne lesende Reportmigration ist produktiv angewendet und journalisiert; Frontend-Release folgt über den regulären Git-/Vercel-Weg. Endgültiger Livebeleg und Deployment-ID im gerätespezifischen Abschluss-Handoff. Keine Antworten verändert; die öffentliche Umfrage läuft unverändert weiter.

## Zugang und Gestaltung

- Produktive Zielroute `/app/admin/league/ideas-2027`, Navigation **Saison & Wertung → Ideen 2027** sowie eine Kachel auf der Liga-Übersicht.
- Bestehende AdminShell, Stitch-Primitives, Markenfarben und zugängliche Radix-Auswahl; keine neue Bibliothek oder separater Dashboard-Host.
- DEV-only Vorschau `/demo/ideen-auswertung` mit 4 explizit erfundenen Einsendungen. Route und Fixtures werden im Produktionsbuild nicht eingebunden.
- Dashboard-, Security-, Web-QA- und React-Prüfung verwendet. Bestehende Anwendung hat Vorrang vor dem separaten Data-App-Starter.

## Messregeln und Datenherkunft

Quelle ist ausschließlich `public.ideas_survey_2027` im Projekt `ssxuurccefxfhxucgepo`, gelesen durch die neue RPC `admin_ideas_survey_2027_report(text,integer,integer,boolean)`.

- Grain: eine zufällige Einsendungs-ID, keine eindeutige Person. Mehrfacheinsendungen möglich. Keine Verbindung zu Profilen; Profile dienen ausschließlich der Admin-Zugriffsprüfung.
- Nur nicht widerrufene, noch nicht abgelaufene Einsendungen. Bestehende Retention-/Widerrufsregeln bleiben unverändert.
- Topline-Zahlen Gesamt/Vollständig/Teilweise sind global. Vollständig bedeutet bestätigter Abschluss (`completed`), nicht bloß eine Anzahl beantworteter Fragen. Teilweise kann noch in Bearbeitung sein, nicht zwingend abgebrochen.
- Der Statusfilter `all|completed|partial` begrenzt sämtliche Diagramme und die Detailpopulation. Alle Zahlen eines Requests stammen aus demselben DB-Snapshot.
- Diagramme zeigen absolute Stimmen sowie Stimmen / tatsächlich auf diese Frage antwortende Einsendungen × 100. Eine fehlende Antwort wird nie zu Nein oder Unentschieden. Bei Nenner 0 bleibt der Prozentwert „–“, nicht gemessene 0 %.
- Teamgröße: Grundgesamtheit nur bei `team_mode=yes`. Andere Einsendungen sind nicht unbeantwortete Teamgrößen.
- `league_changes`: Mehrfachauswahl; Nenner ist Zahl der antwortenden Einsendungen, nicht Zahl aller ausgewählten Optionen. Summe kann >100 % sein.
- Kombinierte Anzeigeoptionen entsprechen dem Fragebogen: Teamwertung aus `team_mode+team_scoring`, Shirt aus `shirt_interest+shirt_policy`, Profiliga aus `pro_league+pro_rule`. Unfertiges Ja wird ausdrücklich „Ausgestaltung noch offen“, nie einer konkreten Regel zugeordnet. Ältere akzeptierte Enum-Werte bleiben mit Kennzeichnung sichtbar.
- „So wurde gefragt“ enthält vorhandene originale Frage-/Optionserklärungen (z. B. Kontrollvorbehalt der Qualifikation), keine nachträglich erfundene Interpretation.
- Die Freitext-Checkbox begrenzt nur die Detail-Liste, nicht die Diagramme. Beide optionalen Textfelder werden vollständig in der geöffneten Antwort angezeigt. Originaltexte sind React-Text, kein HTML.
- Sortierung nach letzter Bearbeitung und UUID absteigend. 20 Detailantworten pro Seite; kein Download aller Rohdaten für Diagramme. Offset/Seitenzahl ändern die Aggregate nicht.
- `fetched_at` ist Abfragezeit, `latest_at` letzte Bearbeitung innerhalb der Statusauswahl; Anzeige Europe/Berlin. Aktualisierung bei Öffnen, Filterwechsel und manuellem Aktualisieren. Keine neue Automation oder Hintergrundüberwachung.
- Laden, leer, leere Filterauswahl, Fehler und Wiederholung sind ausdrücklich sichtbar. Fehler verbergen vorherige Zahlen; kein stiller Ersatz durch Null oder Beispieldaten.

## Sicherheitsgrenzen

- Route unter bestehender ProtectedRoute und RoleGuard `league_admin`.
- RPC `security definer` mit festem Search-Path und aktiver Liga-Adminprüfung über DB-Rolle plus nicht archiviertes Profil. Kein anon execute, keine Tabellenleserechte für anon/authenticated.
- Nur lesende RPC, feste Parameter statt dynamischem SQL. `p_limit` 1–50, Offset 0–1.000.000, Status-Enum und Boolean geprüft. Ungültiges null wird abgewiesen.
- Rückgabe enthält nur Einsendungs-ID, Version, Antworten, Zeitpunkte und Abschlussstatus; weder Token/Hash noch Revision oder Einwilligungsbeleg. Kein privilegierter Schlüssel im Browser.
- Abbruch veralteter Requests über AbortController; privater Zustand nur im gemounteten Adminbereich, keine zusätzlichen Cookies/Storage/URL-Filter für Antwortinhalte.

## Verifikation am 15.10.2026

- 38 isolierte PGlite-Assertions für neue Reportmigration: Rollen/Archivierung, private Grants, totale/partielle Zählung, bedingte Nenner, kombinierte Optionen, Mehrfachauswahl, Freitextfilter, vollständige Aggregate bei Pagination, Ablauf, Grenzen und Metadatenminimierung.
- Bestehende 49 SQL-Prüfungen unverändert erfolgreich.
- Abschließende Vollsuite: 110 Dateien / 559 Tests bestanden; fokussiert 4 Dateien / 18 Tests inklusive anonymem, Teilnehmer-, Hallenadmin- und Ligaadmin-Routenzugriff.
- Produktionsbuild erfolgreich; neue Seite lazy-loaded (ca. 13,4 kB vor letzter Textkontext-Ergänzung). Entwicklungsfixture und Vorschau nicht in Produktion.
- Gezieltes ESLint ohne Fehler; zwei vorhandene Fast-Refresh-Warnungen in AppRoutes.
- Globales tsc mit bekannten Bestandsfehlern (`printableCodeSheet.replaceAll`, appApi-Union-Zugriffe, alte Testmocks), keine Fehler in neuen/geänderten Reportdateien. Nicht als insgesamt bestanden behaupten.
- Live-Preflight bestätigt existierende Quelltabelle, bestehende private Reader-RPC, RLS aktiv und keinen direkten anon/authenticated Lesezugriff.
- Neue Reportfunktion in einer **vollständig zurückgerollten Transaktion** auf echter Produktionsstruktur geprüft, ohne Quelltabellen zu ändern oder Teststimmen anzulegen: aktive Admin-Abfrage, Ablehnung anonym/Teilnehmer, Abgleich mit bestehendem Reader und direktem Nenner, Status-/Freitextfilter. Rückgabe nur Prüfbooleans, keine Antworttexte exportiert. Anschließend bestätigt: neue RPC nicht dauerhaft installiert.
- Browserprüfung bei 320, 390, 768 und 1440 Pixeln: alle 12 Fragen in 8 Themen, keine horizontale Überbreite, Filter per Maus und Tastatur, Teil-/Vollauswahl und Rückkehr zu Alle, Freitextfilter ohne Veränderung der Diagramme, geöffnete Originaltexte, Fragekontext und mobiles Adminmenü. Anonyme echte Adminroute leitet auf Login um. Keine Laufzeitfehler; erwartete lokale Warnungen zu fehlender Supabase-Konfiguration und bestehenden React-Router-Future-Flags. Temporären Viewport zurückgesetzt.
- Screenshots unter `output/admin-ideen-2027-2026-10-15/` im übergeordneten Projektordner; keine echten Antworten in den Bildern. Echte angemeldete Admin-Browserprüfung bleibt bis Rollout offen; Demo nicht als echte Datenansicht ausgeben.

## Rollout und Wiederherstellung

Die Freigabe „okay, bring jetzt live“ liegt am 15.10. vor. Backendmigration und Journal wurden zusammen mit dem Realstruktur-Smoketest in genau einer Transaktion angewendet; Nachprüfung bestätigt Funktion, Journal, privaten Zugriff und unveränderten Retention-Job. Zuvor beschriebene Rollback-Prüfung bleibt als Vorbereitung dokumentiert.

1. Frisch fetchen und Arbeitsbaum/Branch/Upstream prüfen. Genau Migration `20261015100000_admin_ideas_survey_2027_report.sql` im richtigen Projekt anwenden und journalisieren; kein pauschales `db push` und keine Änderungen an Writer/Retention/Antworten.
2. Code normal reviewen/mergen und bestehendes Vercel-Projekt unter Team `kletterliga-nrws-projects` verwenden. Keine alte Moonsight-Duplikat-ID aus dem historischen Project Brief benutzen.
3. Als aktiver Liga-Admin echte Route öffnen und Statusfilter/Detailseite prüfen; anonym und mit unberechtigter Rolle abweisen. Keine fiktiven Stimmen zur Produktionsprüfung nötig.
4. Handoff mit Livebelegen aktualisieren. Bei Rollback nur Frontend zurücksetzen und ggf. exakt die neue Reportfunktion entfernen; Quelltabelle und bestehende Reader-/Writerfunktionen unangetastet lassen.
