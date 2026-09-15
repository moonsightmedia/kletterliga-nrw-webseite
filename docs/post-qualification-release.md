# Teilnehmer-App nach der Qualifikation — Releaseprotokoll

## Produktiv geöffnet am 15.09.2026, 10:08 Uhr (Europe/Berlin)

[Teilnehmer-App](https://www.kletterliga-nrw.de/app): neue Startseite produktiv,
148 freigegebene Teilnehmer, Anmeldung geöffnet bis 27.09.2026, 23:59 Uhr.
Das geprüfte Öffnungsskript wurde um 08:08:02 UTC committed. Nach dem finalen
Test: 148 echte aktivierte Teilnehmer, 148 passende Freigaben, sechs ohne
Ergebnisse, keine verbliebenen QA-Accounts, keine echten Registrierungen zum
Prüfzeitpunkt 10:09 Uhr. Samuel ist als Toprope Ü15-m freigegeben.

Release über [PR #12](https://github.com/moonsightmedia/kletterliga-nrw-webseite/pull/12),
Feature `dc46b3e`, main-Merge `e65265e`. Beide Production-Builds erfolgreich.
Wichtig: Die Canonical liegt im Team `kletterliga-nrws-projects`, **nicht** im
lokal verknüpften Team `moonsight-media`. Ein direkter CLI-Deploy dort aktualisiert
nur dessen Vercel-Aliases. Der anschließende GitHub-Merge hat den bestehenden
Canonical-Releaseweg ausgelöst; keine Domain-/DNS-Zuordnung wurde verändert.
Canonical-Deployment: `dpl_6nx5238tPoLpe3NLDRq5Z6yjHrz2`.

Der echte Browser-Smoke wurde vor dem Öffnen auf der Canonical mit geschlossener
Anmeldung bestanden (12 Prüfungen), danach der vollständige offene Flow mit
23 Prüfungen. Passwortlogin, Anmeldung, Reload, Abmeldung, Wiederanmeldung,
Admin-UI-Absage und Audit funktionieren dort ohne API-Mocks. Keine Browserfehler
oder fehlgeschlagenen Requests; temporäre QA-Konten gezielt entfernt.
Reports: `.qa-post-qualification/live-closed/report.json` und `live-open/report.json`.

Finaler Vollvergleich: 19 der 21 bisherigen public-Tabellen sind unverändert,
darunter alle 221 Profile, 4.047 Ergebnisse, 160 Routen, Codes und Einwilligungen.
Bewusst geändert sind nur die Saisonsettings und elf zusätzliche Auditzeilen
aus den eigenen QA-Profilvorgängen. Die neuen Eligibility-/Registrierungsaudits
protokollieren Freigaben und Tests zusätzlich. Bericht:
`.qa-post-qualification/release-final-check.jsonl`,
`fingerprints-before-opening.jsonl`, `fingerprints-after-opening.jsonl`.

Notion „Finale 03.10.“ wurde aktualisiert und nachgelesen. Noch offen und dort
getrennt notiert: korrektes Geburtsdatum für den bekannten U15-w-Prüffall,
bestätigte Check-in-/Startzeiten, Veranstaltungstagswertung und gesonderte
Teilnehmerkommunikation. Keine Teilnehmer-/Hallenmails in diesem Release.
Die vollständige repositoryweite Typprüfung bleibt wegen dokumentierter
Altfehler/Fixtures separat offen; Build, 198 Vitest-Tests und Feature-QA grün.

## Freigabeprüfung am 15.09.2026

Orga-Entscheidung: Alle 148 aktivierten Teilnehmer dürfen starten, einschließlich
der sechs ohne Ergebnisse. U15 bedeutet jünger als 15 am 01.05.2026; der
konfigurierte inklusive Höchstwert wird deshalb auf 14 gesetzt. Die einzige
dadurch veränderte Klasse ist der besprochene Wechsel Toprope U15-m → Ü15-m.
Geburtsdaten, Ergebnisse und Punkte werden dabei nicht geändert. Ein unplausibles
Geburtsjahr bleibt separat zu klären; die bisherige U15-w-Zuordnung bleibt
vorläufig bestehen. Keine Korrektur eines Geburtsdatums auf Verdacht.

`scripts/approve-semifinal-2026.sql` übernimmt genau diese 148 Freigaben als
Saison-/Klassen-Snapshots; `scripts/open-semifinal-2026.sql` öffnet anschließend
separat nach erfolgreichen Releaseprüfungen. Beide Operationen prüfen den
erwarteten Saisonstand und laufen standardmäßig mit ROLLBACK. Nur ein explizites
`psql -v apply=true` schreibt dauerhaft. Der Orga-Auftrag wird als Serverwartung
mit leerem menschlichem Audit-Akteur ausgeführt, nicht als erfundener Adminlogin.

Aktuelle Verifikation: 198/198 Vitest-Tests grün, Produktionsbuild erfolgreich,
fokussiertes ESLint ohne Fehler (eine bestehende Fast-Refresh-Warnung). Der alte
Dashboard-Testmock wurde an die bereits verwendete `countResults`-API angepasst.
Die repositoryweite Typprüfung meldet weiterhin bekannte Altstellen/Fixtures;
ein vollständig grüner Typecheck wird nicht behauptet. Erneut 38 Teilnehmer-
und neun Admin-Browserchecks bestanden.

Zusätzlich prüft `scripts/qa-semifinal-live.mjs` die echte Auth-/PostgREST-Kette:
Passwortlogin, Startberechtigung, Anmeldung, Neuladen, idempotente Doppelanmeldung,
Abmeldung, Wiederanmeldung, Adminansicht/Absage und Audit. Die UI war dabei lokal,
das Backend produktiv; es waren keine API-Mocks aktiv. Vor der echten Freigabe
wurde ausschließlich mit eigenen markierten `.invalid`-Testkonten geprüft.
Solange keine echten Athleten freigegeben waren, wurde die offene Phase kurz
getestet und im `finally` wieder geschlossen. Das ist kein separater vollständiger
Staging-Stack; es ergänzt die 66 isolierten SQL-Prüfungen. 24 Live-Prüfungen
bestanden, keine Browserfehler/fehlgeschlagenen Requests. Alle Testkonten danach
gezielt gelöscht; Profile (221), Ergebnisse (4.047) und Routen (160) sind per
vollständigem SHA256-Datenvergleich unverändert. Teständerungen bleiben auditierbar.
Keine E-Mails versendet.

Unmittelbar vor der Freigabe wurde außerdem ein zweites verschlüsseltes,
per Entschlüsselungs-Roundtrip geprüftes Backup erstellt:
`%LOCALAPPDATA%/Kletterliga-QA/backups/20260915-before-semifinal/public-before-opening.dump.dpapi`.
Berichte: `.qa-post-qualification/live-closed/report.json`,
`live-preapproval/report.json`, `vitest-release.json`, `after-release/report.json`.

## Historischer Stand der Backend-Einführung

Stand: 15. September 2026. Branch `codex/halbfinal-registration-lock`, Basis
`origin/main` / `faeea6a`. Die Backendmigration wurde am 15.09.2026 gegen
08:55 Uhr nach Nutzerfreigabe produktiv angewendet; die Consent-Function ist
Version 9. Die neue Oberfläche läuft weiterhin lokal, ohne Vercel-Deployment.
Keine Freigabe echter Athleten, keine Öffnung der Anmeldung und keine E-Mail.

Vorher/nachher geprüft: alle 21 bisherigen public-Tabellen haben identische
Zeilenzahlen und vollständige Datenfingerprints, darunter 4.047 Ergebnisse,
221 Profile und 160 Routen. Bestehende Einstellungen und Ranglistenlogik sind
unverändert. Die Ergebnis-Schreibsperre ist aktiv; die Statusfunktion liefert
für einen aktiven Teilnehmer `pending`, `registration_open=false`.

## Produkt- und Designentscheidung

Zielgruppe sind bestehende Teilnehmer. Nach dem letzten Qualifikationstag ist
die Hauptaktion die Zusage zum Halbfinale; Ranglisten, Routen und eigene
Ergebnisse bleiben als Archiv erreichbar. Vorher bleibt das Dashboard bestehen.
Die Altersregel, die Ranglistenberechnung und die Zulassung von Teilnehmern ohne
Ergebnisse werden hier nicht entschieden.

Die bestehende Teilnehmer-App ist die Designreferenz: `docs/stitch_design.md`
und `src/app/stitch-theme.css`, nicht der separate Halbfinal-Routenplaner.
Übernommen werden Navy `#003d55`, Terrakotta `#a15523`, Creme `#f2dcab`, Space
Grotesk/Manrope und vorhandene Stitch-Komponenten. Es gibt keine neuen Design-
oder Backend-Abhängigkeiten und keine erfundenen Zeiten, Kennzahlen oder Bilder.

Nach Nutzerfeedback vom 15.09. folgt die Halbfinalseite wieder dem durchgehend
dunklen Dashboard: kompakter Großbuchstaben-Kopf, getönte Panels, Creme-Schrift
und Terrakotta-Hauptaktion. Mobil einspaltig, ab 820px zweispaltig, maximal
`max-w-4xl`. Die feste Navigation bleibt bestehen; Scrollabstände halten den
Tastaturfokus darüber sichtbar. Dialoge haben eine Abbruchaktion.

Ein einmaliger, überspringbarer 2,6-Sekunden-Abschluss füllt die konfigurierten
Etappen und öffnet anschließend die Halbfinalseite unter der Start-URL `/app`.
100 Prozent bezeichnet ausschließlich den abgelaufenen Qualifikationszeitraum,
nicht eine Startberechtigung. Wiederholte Besuche sowie reduzierte Bewegung
öffnen die Seite direkt. Details: [Designvertrag](semifinal-design-contract.md).

Termin und Anmeldefrist kommen aus den Saison-/Registrierungseinstellungen.
Veranstaltungsort gemäß bestehender Eventseite: Kletterwelt Sauerland,
Rosmarter Allee 12, 58762 Altena. Check-in, Startzeiten und Ausrüstungshinweise
werden ausdrücklich als noch zu ergänzen bezeichnet.

## Umgesetzter Umfang

- Datenbankmigration schützt Ergebnis-INSERT/UPDATE/DELETE außerhalb der
  Qualifikationszeit, inklusive alter Clients. Der gesamte letzte Tag zählt
  in `Europe/Berlin`; ungültige Saisonkonfiguration sperrt.
- Teilnehmer sehen gespeicherte Punkte, Flash, Sternebewertung und Kommentar,
  jedoch keine Bearbeitungsfelder. Codeabfragen blockieren den eigenen
  Ergebnis-Leseweg nach Ende nicht mehr. Bestehende Leseberechtigungen bleiben.
- Wettbewerblich relevante Profilfelder sind nach Ende geschützt. Der
  teilnehmeraufrufbare Consent-Dienst legt Profile nur noch an, statt bestehende
  Wettkampfdaten aus veränderbaren Auth-Metadaten zu überschreiben.
- Halbfinalanmeldung hat Lade-, Fehler-, Wartestatus-, Freigabe-, Frist-,
  Anmelde- und Abmeldezustände. Erfolg erscheint erst nach Serverbestätigung.
  Fehlende Freigabe oder geschlossene Anmeldung lässt keine Zusage zu.
- Orga-Freigaben sind explizite Saison-/Liga-/Klassen-Snapshots. Kein Athlet
  wurde automatisch freigegeben. Eine gespeicherte Anmeldung ohne aktuelle
  Berechtigung wird nicht als endgültig bestätigter Start angezeigt.
- An-/Abmeldungen und Freigaben werden protokolliert. Adminlisten verwenden
  aktuelle Saison und Status; Absagen behalten den Datensatz und Audit.
  Es wird keine automatische Benachrichtigung versprochen.

## Verifikation und Grenzen

Die Browserprüfung nutzt ausschließlich synthetische Konten/Ergebnisse und
abgefangene API-Antworten. Das prüft UI-Verhalten und Request-Verträge, **nicht**
die Ausführung der PostgreSQL-Trigger. Der reproduzierbare Einstieg ist
`scripts/qa-post-qualification.mjs`; Berichte und Bilder liegen lokal unter
`.qa-post-qualification/` (Git-ignoriert). Die Testumgebung verwendet einen
fiktiven Supabase-Host; ihre Umgebungswerte dürfen nicht veröffentlicht werden.

Geprüft werden Anmeldung inklusive Neuladen, bestätigte Abmeldung,
widerrufene Freigabe, Fehler/Wiederholung, deaktivierte Aktionen, Archivpfad,
Rangliste, Tastaturfokus und Ansichten bei 320, 390, 768 sowie 1440 Pixeln.
Ein 320px-Clipping und verdeckter Tastaturfokus wurden dabei behoben.

Unit-Tests ergänzen Berlin-Tagesgrenzen/Sommerzeit, Ablauf eines bereits
geöffneten Tabs, unveränderliches Archiv, Registrierungs- und Admin-APIs sowie
den tatsächlichen isolierten Consent-Profilinitializer. Der Build ist lokal
ausführbar. Der Gesamtbestand enthält einen schon im Original-Checkout
reproduzierten Dashboard-Testfehler (fehlendes `countResults` im Mock) und
bestehende TypeScript-Fehler in anderen Altstellen/Fixtures. Deshalb wird kein
vollständig grüner Repository-Check behauptet.

Die SQL-Prüfung wurde am 15.09. mit autorisierter portabler PostgreSQL-17.11-
Runtime durchgeführt: 66 Assertions bestanden, einschließlich fünf Vergleichen
zum Erhalt alter Daten. Die Testdaten waren ausschließlich synthetisch; Schema,
Grants, RLS und Trigger stammen aus einem frischen Produktions-Schemaexport.
Der Testserver ist danach gestoppt, kein Windows-Dienst eingerichtet.
Exakte Release-Reihenfolge und Negativfälle:
[Datenbank-Release-Gate](../supabase/tests/POST_QUALIFICATION.md).

Lokale Ergebnisse der ursprünglichen Vorbereitung (14.09.):

- Produktionsbuild erfolgreich, 3118 Module; lediglich bestehender Hinweis auf
  veraltete Browserslist-Daten.
- Vitest: 192 von 193 Tests bestanden. Einziger Fehler ist der oben genannte,
  im Original-Checkout reproduzierte Dashboard-Mock.
- Teilnehmer-Browserprüfung: 38 von 38 Checks, 44 eindeutige Nachher-Screenshots.
- Admin-Browserprüfung: 9 von 9 Checks bei 390/768/1440 Pixeln, einschließlich
  Absagedialog und aktualisierter Liste. Reproduktion:
  `node scripts/qa-semifinal-admin.mjs`.
- Fokussiertes ESLint: keine Fehler; bestehende Fast-Refresh-Warnung in
  `AppRoutes.tsx`. TypeScript-Gesamtprüfung bleibt wegen bestätigter Altfehler
  rot; keine zusätzliche Fehlermeldung durch diese Umsetzung festgestellt.

Nach der Designüberarbeitung (15.09.): 38 UI-/Navigationsprüfungen plus 14
Animations-/Übergangsprüfungen bestanden; 320/390/768/1440px, keine unerwarteten
Browserfehler. Fünf neue Unit-Tests für Übergang, Skip/Fokus, Wiederholung,
Profil-/Saisontrennung, reduzierte Bewegung und Speicherausfall. Gesamt-Vitest:
197/198 bestanden; derselbe bekannte Dashboard-Mock bleibt rot. Fokussiertes
ESLint ohne Fehler; Build erfolgreich (3120 Module). Testnachweise unter
`.qa-post-qualification/after-redesign`, `after-motion` und
`vitest-redesign.json`. Animationsframes wurden für reproduzierbare Bilder
pausiert; der automatische Übergang zusätzlich mit Browser-Testuhr ausgeführt.

## Backend-Rollout und verbleibender Schritt

Rollout-Preflight vom 15.09., 08:30 Uhr: Supabase-Projekt war erreichbar und
`ACTIVE_HEALTHY`. Alle 39 bisherigen lokalen Migrationen sind im Remote-Stand
vorhanden (bis `20260529120000`); die neue Halbfinalmigration war noch nicht angewendet.
Git nach frischem Fetch unverändert auf `faeea6a`, ohne Ahead/Behind zu main.
Es existierte kein Supabase-Testbranch; lokal fehlte PostgreSQL. Die danach
ausdrücklich genehmigte portable Runtime wurde ausschließlich auf localhost
für den isolierten Test genutzt. Dry-run bestätigte genau eine neue Migration.

Technischer Zugangshinweis ohne Geheimwerte: Der geerbte
`SUPABASE_DB_PASSWORD`-Wert wird vom Server abgelehnt. Mit ausschließlich für
den CLI-Unterprozess entfernter Variable funktioniert der vorhandene
Supabase-Login über die temporäre Login-Rolle. Kein Passwort wurde geändert
oder dauerhaft aus der Umgebung entfernt. Nicht mit `--debug` protokollieren.

Die Tests fanden und behoben zusätzlich eine Auth-Delete-Cascade-Regression
der neuen Sperren sowie die Übernahme einer Adminrolle aus Auth-Metadaten
durch den alten Bestätigungstrigger. Neue Profile können sich weder eine
Adminrolle noch Aktivierung erteilen; vorhandene Profile wurden nicht verändert.
Die bestehende Admin-Löschfunktion bleibt nur für die vertrauenswürdige Auth-
SQL-Session bei FK-Cascade funktionsfähig; Client-Rollenangaben reichen nicht.

Sicherung: verschlüsseltes public-Archiv mit 21 Tabellen unter
`%LOCALAPPDATA%/Kletterliga-QA/backups/20260915-before-semifinal/public-before.dump.dpapi`.
DPAPI-Entschlüsselung braucht das gleiche Windows-Benutzerprofil. Archivkatalog,
vollständige Datenextraktion im Speicher und alle Zeilenzahlen verifiziert;
kein Restore auf Produktion. Nachweise liegen Git-ignoriert unter
`.qa-post-qualification/backup-verification.json`, `database-test-report.json`,
`fingerprints-before.jsonl`, `fingerprints-after.jsonl` und `postflight.txt`.

Live-Prüfung: Migration in der History, alle sechs neuen Trigger aktiv,
anonyme RPC-Aufrufe korrekt abgewiesen (401/42501 statt fehlender Funktion),
authentifizierter Status in einer read-only DB-Transaktion erfolgreich.
Heruntergeladene Consent-Version 9 entspricht dem geprüften Quelltext;
read-only HTTP-Smoke-Test 405 wie vorgesehen. 33 fokussierte Vitest-Tests grün.

Nächster fachlicher Schritt: endgültige Teilnehmerliste/Startklassen freigeben
und Zeitpunkt der Anmeldung festlegen. Vor Öffnung vollständiger Teilnehmer-
HTTP-E2E-Test; lokal wurden SQL-Rollen/Auth-Trigger, nicht ein kompletter GoTrue-
und PostgREST-Server betrieben. `finale_enabled=false`, keine Freigaben.
Frontend-Veröffentlichung und Git-Übernahme des Worktrees stehen separat aus;
Backend-Sperren bei einem UI-Rollback nicht entfernen.
