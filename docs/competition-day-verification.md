# Halbfinal-Wettkampftag – Prüfstand 23.09.2026

## Backend-Release am 23.09.2026

Auf ausdrücklichen Wunsch der Orga wurde die additive Migration
`20260923160000_competition_day.sql` nach einem Dry-Run (genau eine offene
Migration) direkt auf das bestehende Supabase-Projekt angewendet. Zuvor wurde
das vollständige `public`-Schema samt Daten verschlüsselt unter
`%LOCALAPPDATA%/Kletterliga-QA/backups/20260923-before-competition/public-before.dump.dpapi`
gesichert; die DPAPI-Entschlüsselung wurde im selben Benutzerprofil geprüft.
Alle **21 vorher vorhandenen öffentlichen Tabellen** hatten unmittelbar nach
der Migration und nach der Live-QA dieselben Zeilenzahlen und Vollzeilen-Hashes.
Insbesondere blieben die **4.047 Qualifikationsergebnisse** und die damals
**65 Halbfinalanmeldungen** erhalten.

Ein echter Auth-/PostgREST-Test auf einer zufälligen QA-Saison bestand
**27 Prüfungen**: Admin- und Schiedsrichterrechte, fünf Routen, QR-Abgabe,
falscher Code, doppelte Abgabe, Korrekturaudit und geschlossene Eingabe.
Drei eigens erzeugte `.invalid`-Konten, die QA-Veranstaltung und ihre
Test-Auditspuren wurden mit exakter Identitätsprüfung entfernt. Die aktive
Saison und der Anmeldestatus wurden nicht umgestellt. Die Kamera-Richtlinie
in `vercel.json` erlaubt nach dem Fix `camera=(self)`; Mikrofon und Standort
bleiben gesperrt. Der Frontend-Release und echte Geräte-Kameratests sind
separate Gates; die Wettkampfeingabe wurde nicht geöffnet.

## Implementierter Umfang

Umsetzung auf `codex/competition-day-mode`, ausgehend von `0100b35`.
Koordination durch Hauptagent; Datenbank/API, Teilnehmeroberfläche und
Schiedsrichteroberfläche durch drei `gpt-6-luna`-Sub-Agenten. Hauptagent:
Adminoberfläche, Integration, unabhängige Durchsicht, Browser- und Gesamtprüfung.

Der vereinfachte Nutzerablauf ist maßgeblich: keine Startnummer, keine
Teilnehmersuche am Routenposten, kein digitaler Bestätigungsklick des Schiedsrichters.
Der Routenposten zeigt seinen statischen Code nach kurzem Kontakt; die Person
scannt **in der App** und sendet ihr eigenes Ergebnis ab. QR-Code ist kein Nachweis
einer sportlichen Schiedsrichterprüfung. Nach Abgabe sind nur begründete,
protokollierte Orga-Korrekturen möglich.

## Verifikation

- `npm test`: **63 Testdateien, 252 Tests bestanden** einschließlich
  Kamera-Policy-Test nach dem Release-Fix.
- `npm run build`: bestanden; Browserdaten-/Bundlegrößenhinweise bleiben.
- `node scripts/qa-competition-browser.mjs`: **75 Prüfungen, 0 Fehler**.
  Lokaler Vite-Server, ausschließlich synthetische Konten und vollständig
  abgefangene externe API-Anfragen. Viewports 320, 390, 768, 1440 Pixel.
  Routen, Entwurf nach Reload, gesperrtes Ergebnis, parallele Timer nach Reload,
  Admin-Speichern/Öffnen/Sperren, schmale Ansichten und Druckbogen geprüft.
  Ein gerendertes QR-Bild wurde mit der vorhandenen Scanbibliothek zurückgelesen
  und mit dem vollständigen erwarteten synthetischen Routen-Payload verglichen.
- `node scripts/qa-competition-sql.mjs <PGLITE_PACKAGE_DIRECTORY>`:
  tatsächliche neue Migration und `supabase/tests/competition_day.sql` ausgeführt;
  zusätzlich **36 Assertions bestanden**. Temporäre PGlite-Installation außerhalb
  der Projektabhängigkeiten. Minimaler Nachbau von Auth-/Alttabellen, kein Zugriff
  auf Supabase-Produktion. Grenzen: kein vollständiges Supabase, kein PostgREST,
  kein Auth-Trigger-Gesamttest und keine konkurrierenden Datenbankverbindungen.
- Verbotene Rollen und direkte Tabellenzugriffe, falsche Route/Token, fehlende
  Anmeldung, archivierte Profile, Nullwerte, geschlossene Eingabe, Doppelabgabe,
  Korrekturaudit, Gleichstände, fehlende Klassen, Staff-Entzug und Teilnehmer,
  die zugleich Helfer sind, werden im Datenbank-Test geprüft.
- Gezieltes ESLint: keine Fehler; drei Fast-Refresh-Warnungen für gemeinsam mit
  der Teilnehmerkomponente exportierte Test-Helfer.
- `git diff --check`: bestanden.
- Der **echte App-Typcheck** `npx tsc --noEmit -p tsconfig.app.json` scheitert
  weiterhin an vorhandenen Problemen in unveränderten Dateien (`appApi.ts`,
  `printableCodeSheet.ts` und älteren Tests). Keine Fehler in neuen Wettkampftag-
  Dateien. `npx tsc --noEmit` ohne Projektflag prüft hier die App nicht vollständig
  und darf nicht als Ersatz für diesen Check genannt werden.

Browser-Evidenz liegt lokal unter `.qa-post-qualification/competition/` (ignoriert
von Git): Screenshots, Druckansicht und `report.json`. Keine echten Routen-Tokens
oder Teilnehmerdaten in Testdateien/Evidenz.

## Vor Freigabe der Wettkampfeingabe

1. Kamera auf iPhone/Safari und Android/Chrome testen, gedruckten QR und Code auf
   zweitem Handy scannen. Netzunterbrechung, erneute Abgabe und Kameraerlaubnis
   prüfen. Desktop-Bilddecodierung ersetzt keinen Gerätestest.
2. Routen/Klassen sowie Zonenpunkte und Flash-Bonus fachlich bestätigen. Technischer
   Arbeitsstand: Zone 10 = TOP, Flash nur bei TOP; vor Öffnung Regelwerk abgleichen.
3. Frontend kontrolliert veröffentlichen. Keine automatischen Beispieldaten,
   keine automatische Öffnung. Produktion ist Vercel-Projekt
   `kletterliga-nrw-webseite` im Team `kletterliga-nrws-projects`, nicht das frühere
   Moonsight-Duplikat. Backend-Migration ist bereits produktiv angewendet.
4. Im Adminbereich `Wettkampftag` Konfiguration speichern, Helferkonten freigeben
   und Codes erst von der endgültigen App-Domain aus drucken. Routennummern an
   Wand, Druckbogen und App abgleichen. Erst am gewünschten Zeitpunkt öffnen.

## Betriebsgrenzen und Rückfall

- Ergebnisse werden online bestätigt; lokale Entwürfe sind noch keine Abgaben.
  Bei Handy-/Netzausfall braucht die Orga eine Notfallliste mit Name, Startklasse,
  physischer Route, Zone/Flash und Zeitpunkt. Nicht unbemerkt als erledigt behandeln.
- Stoppuhren sind unabhängig und zeitstempelbasiert; Anzeige nach Reload stimmt
  auch bei gedrosselten Browser-Ticks. Ton bei gesperrtem Display/im Hintergrund
  ist nicht garantiert. Aktives Display und unabhängige Uhr als Rückfall einplanen.
- Statische QR-Codes können kopiert werden. Helferzugang entziehen sperrt neue
  Abrufe, macht bereits kopierte/gedruckte Codes aber nicht ungültig.
- Erste Öffnung friert Routen/Scoring ein. Eingabe kann geschlossen und mit
  derselben Konfiguration wieder geöffnet werden. Zum Rückrollen niemals
  Ergebnis- oder Audit-Tabellen löschen; zuerst Eingabe schließen und sichern.
- Halbfinalrangliste zeigt Zwischenstände, keinen automatisch bestätigten
  Finaleinzug. Das spätere Ein-Routen-Finale mit Schiedsrichtereingabe und offenen
  Zeit-/Tie-Break-Regeln ist nicht Teil dieses Releases.
- Vorhandene Änderungen in `supabase/.temp/*` wurden nicht aufgeräumt. Bestehende
  Qualifikationsdaten, Anmeldungen und Saisonfreigaben wurden nicht verändert;
  nur neue Wettkampftag-Tabellen/Funktionen wurden angelegt und isolierte QA-Daten
  erstellt sowie nach dem Test entfernt. Keine E-Mails versendet.
