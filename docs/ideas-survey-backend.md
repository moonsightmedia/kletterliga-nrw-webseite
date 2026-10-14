# Ideen-Umfrage 2027: Backend-Vorbereitung

## Erster produktiver Backend-Release am 14.10.2026

Die folgenden Abschnitte sind die historische Vorbereitung. Aktuell produktiv: genau die Migrationen `20261014120000`, `20261014130000` und `20261014163000` inklusive Journal kontrolliert angewendet, neue Function `submit-ideas-survey-2027` als einzige Function deployt. Kein pauschales `db push`. Einwilligung Version **2** (ab 16), Version 1 nie live. Tabelle war vorher nicht vorhanden; keine Bestandsantworten migriert. Vollständiger Transaktions-Smoketest vor Commit und noch einmal beim Apply: private Rechte, aktive Admins/abgewiesene Teilnehmer, Versions-/Besitz-/Revisionsschutz und Widerruf. Testfixtures danach entfernt.

49 isolierte PGlite-Prüfungen inklusive Retention und 14 echte HTTP-Prüfungen für Draft/Complete/identischen Retry/Owner/Origin/Consent/Withdraw erfolgreich. Eigene synthetische API-Einsendung anschließend exakt per UUID und Schlüsselhash entfernt; keine Teilnehmerdaten verändert. Keine Secret-Werte dokumentiert. Backend bereit, Frontend-Veröffentlichungsstatus im Release-Dokument.

Retention: stündlicher `pg_cron`-Job `ideas-survey-2027-retention`, vor 31.03.2027 20:00 UTC No-op, danach produktive Tabelle einschließlich Tombstones leeren. Writer verweigert ab dann neue Antworten, Admin-RPC blendet sie aus. Bei Backup-Restore Purge vor App-Freigabe wiederholen. Backup-Retention ist separat und wird im Datenschutzhinweis nicht als sofortige physische Löschung versprochen. PITR live deaktiviert; keine Backup-Tarifänderung.

Stand: 14.10.2026. **Nur lokal vorbereitet; keine Migration und keine Function produktiv angewendet.**

## Aktueller Autosave-Vertrag

Präsentationsrevision: Der Einwilligungsstart erfolgt jetzt in einem Popup über der sichtbaren ersten Frage. Schließen/Öffnen gilt niemals als Zustimmung. Keine Backendänderung und weiterhin Einwilligung Version 1; kein Request bis zur ausdrücklichen Zustimmung und ersten Antwort. Details zur Darstellung stehen in der Produktdokumentation.

Aktuelle Ergänzung: Erste Frage ist schon vor dem Start sichtbar, ihre Antworten und die Navigation sind jedoch nativ deaktiviert. Erst „Einverstanden – Umfrage starten“ schaltet sie frei. Kein separater Nichtteilnahmebutton; Nichtstarten übermittelt keine Antworten. Start alleine erzeugt keinen Request. Draft/Complete verlangen `{consent:{accepted:true,version:1}}` in Hook und öffentlicher API; SQL verlangt dieselbe Version. Der erste Serverempfang wird als `consent_recorded_at` mit Version unveränderlich gespeichert. Textfassung: `docs/ideas-survey-consent-v1.md`. Keine nachträgliche Einwilligung für Bestandsantworten unterstellen. Die beiden lokalen noch unveröffentlichten Migrationen erwarten eine neue leere Tabelle; bei tatsächlichem Bestand einen gesonderten Migrations-/Freigabeplan erstellen.

Widerruf mit einem Klick auf der Umfrageseite, oder später mit vorher heruntergeladenem vertraulichem Code auf `/ideen-2027/widerruf`. Code = UUID plus zufälliger Bearbeitungsschlüssel; nicht URL, Logs oder Browser-Storage. Direktlink auch im Einstieg und Datenschutzhinweis, noindex, Telemetrie ausgeschlossen. Löschen benötigt keine erneute Einwilligung, nur Besitznachweis. Revision 10000; SQL priorisiert einen gültigen Besitzer-Widerruf unabhängig von Antwortrevisionen, auch bei gleicher Maximalrevision. Erfolgreicher Besitzer-Retry auf Tombstone idempotent. Gelöschte Antworten werden niemals wiederhergestellt. Kein Wiederaufnehmen nach Reload; ohne gesicherten Code keine Zuordnung. Nachweismetadaten/Tombstone ebenfalls im Retention-Prozess berücksichtigen.

Frontend nutzt denselben öffentlichen Endpunkt zusätzlich mit `mode: draft | complete | delete`, `revision: 1..10000` und einem zufälligen 256-Bit-`write_token` (64 Hexzeichen). Token bleibt nur im Arbeitsspeicher der Seite, niemals URL, Logs oder Browser-Storage. Kein Produktions-Token steht in dieser Dokumentation. `draft` erlaubt validierte Teilantworten, `complete` benötigt vollständige Antworten, `delete` ausschließlich leere Antworten. Minimale Dauer für Draft ist 0 ms (erste Auswahl); keine Antwort wird vorgefiltert wegen schnellen Lesens.

Jede Auswahl startet sofort einen POST. Die optionalen Textfelder `league_idea` und `weighting_idea` speichern nach 400 ms Schreibpause, bei Blur und vor Weiter/weiterer Auswahl. Beide sind typgeprüft, auf 500 Zeichen begrenzt, lehnen unerlaubte Steuerzeichen ab, normalisieren Zeilenumbrüche und werden getrimmt; leer bedeutet fehlendes Feld. Andere freie Felder bleiben verboten. UI zeigt Texte ausschließlich als React-Text. Der lokale, noch unveröffentlichte Basisvalidator in der ersten Migration wurde entsprechend erweitert; nicht blind gegen einen unbekannten produktiven Schema-Stand anwenden.

Revisionsprüfung erfolgt atomar im service-role-only RPC `save_ideas_survey_2027`; verspätete ältere Revisionen werden abgewiesen. Dieselbe Revision ist nur mit identischen Daten und Status idempotent. Ein fremder Schlüssel kann nichts ändern. Die Edge Function hasht den Schlüssel vor dem DB-Aufruf. `keepalive` lässt bereits gestartete Requests beim Verlassen weiterlaufen, ist aber keine Zustellgarantie: Browser-/Netzausfälle sind sichtbar als unbestätigte Speicherung, nicht als Erfolg.

Die kompakte UI kombiniert Teammodus+Wertung, Shirt+Verbindlichkeit und Profi-Liga+Regel jeweils in einer Auswahl. Sie setzt weiter die vorhandenen Eltern-/Kindfelder. Teamgröße erscheint nur bei Teamwunsch und bietet zwei/vier. Ältere gültige Enum-Werte bleiben im Validator unterstützt, auch wenn die aktuelle UI sie nicht mehr anbietet. Nach Einzelwahl automatischer Wechsel auf die nächste sichtbare Frage; Mehrfachwahl und bewusst geöffnetes Textfeld benötigen Weiter. Abschluss bleibt getrennt und sperrt Änderungen bei unklarem Empfang bis zum identischen Retry.

Migration `20261014130000_ideas_survey_2027_drafts.sql` erweitert die ursprüngliche Tabelle um `completed`, `withdrawn`, `revision`, `write_token_hash`, `updated_at` und partielle CHECK-Validierung. Prüfer füllt fehlende Felder nur **intern zur Validierung**, speichert diese Platzhalter nie. Kein direkter öffentlicher oder authenticated UPDATE/DELETE; ausschließlich service-role-RPC mit Besitzprüfung. Löschen leert `answers` und hinterlässt einen gesperrten Tombstone. Das verhindert Wiederherstellung durch alte Requests. Tombstone-Metadaten brauchen ebenfalls den bestätigten Retention-Prozess.

Admin-RPC jetzt `{total, completed, partial, latest_at, entries}`; nur nicht widerrufene Datensätze, jeder Eintrag enthält `completed` und `updated_at`. Token/Hash/Revision werden nicht ausgegeben. Vor Aggregation je Frage nur tatsächlich vorhandene Antworten zählen, Teil-/Vollantworten und jeweilige Nenner getrennt nennen. Kein Login heißt weiterhin keine sichere Anzahl einzelner Menschen.

Vor erster Auswahl expliziter freiwilliger Einwilligungsstart, lokal überarbeitete Datenschutzseite und direkter Widerruf; keine Umfrage-Cookies/localStorage, keine optionalen Seitenanalyse-Events auf der 2027-Umfrage-/Widerrufsseite. Bestehende Interessenabfrage unabhängig mit localStorage, dafür gesondertes Datenschutz-Gate. Rechtsgrundlage der Umfrage nun Art.-6(1)(a), nicht mehr der frühere Interessenabwägungsentwurf. Einwilligungswirksamkeit inklusive Minderjähriger, Hosting/AV/Drittland-/Logprüfung und Löschprozess sind **vor Live offen**; keine Rechtsfreigabe. Siehe Produktdokumentation und amtliche DSK/TDDDG-Quellen.

## Historischer Legacy-Vertrag (öffentlicher Pfad stillgelegt)

Die folgende Beschreibung dokumentiert ausschließlich den früheren Prototype. Die aktuelle Function weist Requests ohne Draft/Complete/Delete-Modus und ohne erforderliche Einwilligung/Bearbeitungsschlüssel ab. `validateIdeasSurveyPayload` bleibt nur als isolierte Antwortformat-/Testhilfe erhalten; kein aktueller öffentlicher Speicherweg.

`POST /functions/v1/submit-ideas-survey-2027`, JSON, öffentlich ohne Teilnehmer-Login.
Der Browser sendet nur den öffentlichen Projekt-Key; keinen persönlichen Auth-Token.

```json
{
  "survey_version": 1,
  "submission_id": "67192735-99bc-4d51-bb34-87b0f3f214f3",
  "answers": {
    "digitalization": "yes", "paper_cards": "no", "team_mode": "no",
    "shirt_interest": "no", "pro_league": "no", "league_changes": ["keep"],
    "qual_weight": "same", "hall_model": "all", "hall_count": "8",
    "community_events": "both", "weighting": "none"
  },
  "website": "",
  "fill_time_ms": 120000
}
```

Alle Kernfragen benötigen eine Antwort; der gespeicherte Vertrag unterstützt weiterhin `unsure`, auch wenn nicht jede aktuelle UI-Frage diese Option anbietet.
Wenn `team_mode=yes`, müssen `team_size` und `team_scoring` gesetzt werden.
Wenn `shirt_interest=yes`, muss `shirt_policy` gesetzt werden.
Wenn `pro_league=yes`, muss `pro_rule` gesetzt werden.
Sonst müssen diese Kindfelder fehlen oder im Transport leer sein; die kanonische
Speicherung entfernt leere Kindfelder. Versteckte alte Antworten werden abgewiesen.
`league_changes` ist eine nichtleere Auswahl ohne Duplikate; `keep`/`unsure`
dürfen nicht mit anderen Optionen kombiniert werden. Vollständige Enums und
Typen stehen in `supabase/functions/submit-ideas-survey-2027/validation.ts`.

Erfolg ist immer `{ "ok": true }` (201 neu, 200 unveränderter Wiederholungsversuch).
Dasselbe zufällige UUID-v4 `submission_id` bei Retry behalten; ein geänderter
Antwortsatz mit derselben UUID wird mit 409 abgelehnt, nicht überschrieben.
Checkbox-/JSON-Reihenfolge ist unerheblich. Bei unsicherem Netzwerkfehler daher
keine neue UUID erzeugen. Die UUID gehört nur zu diesem Absendeversuch,
**nicht zu einer Person, einem Browser oder einem Teilnehmerkonto**.

## Speicherung und Zugriff

Die ursprüngliche Migration (vor Draft-Erweiterung) speichert `submission_id`,
`survey_version`, validierte `answers` und serverseitiges `created_at`.
Keine eigenen Namens-, E-Mail-, Profil-, Cookie-/Geräte- oder IP-Felder. Zwei optionale begrenzte Ideentexte können dennoch identifizierende Inhalte enthalten; Warnhinweis im Formular, privater Zugriff und Retention gelten auch dafür.
RLS ist aktiviert; `public`, `anon` und `authenticated` haben keinen direkten
Tabellenzugriff. Die Edge Function verwendet `SUPABASE_URL` und
`SUPABASE_SERVICE_ROLE_KEY` ausschließlich aus der Supabase-Laufzeitumgebung.
Service-Rolle darf lesen/einfügen; Function implementiert keine Updates/Löschung.
Die DB wiederholt Feld-/Enum-/Konditionalvalidierung als CHECK-Constraint.

`admin_ideas_survey_2027(p_offset=0,p_limit=20)` liefert nur aktiven Liga-Admins
(`is_league_admin()` und nicht archiviertes eigenes Profil) `{ total, latest_at,
entries }`. Seitenumfang 1–50; stabil nach Zeitpunkt/UUID absteigend sortiert.
Kein öffentliches Ergebnis-/Zählendpoint. Admin-UI-Anbindung ist separate Arbeit;
dieses RPC ist nur die geschützte technische Grundlage.

## Missbrauch, Grenzen und Datenschutz

- Nur HTTPS-Origin `www.kletterliga-nrw.de` und `kletterliga-nrw.de`, kein
  produktives Wildcard-/Localhost-CORS. CORS ist **keine** Bot-Authentifizierung.
- Maximal 8192 UTF-8-Bytes vor JSON-Parsing; Body wird streamend begrenzt.
- Ganzzahliger Ausfüllzeitraum 3 Sekunden bis 24 Stunden. Kein Beweis menschlicher Teilnahme.
- Honeypot `website`: gefülltes Feld wird scheinbar erfolgreich beantwortet,
  aber niemals gespeichert. Timing/Honeypot werden nicht in die Tabelle übernommen.
- Best-Effort-Limit jetzt 1200 Requests/IP/Stunde für Auswahl-Speicherungen **nur flüchtig**, IP pro Function-Isolate
  mit flüchtigem Salt gehasht; maximal 10000 aktive Schlüssel. Keine IP-Logs oder
  Antwortzuordnung durch unseren Code. Hosting-/Gateway-Logs können trotzdem
  technische Metadaten verarbeiten; nicht „vollständig spurenlos“ versprechen.
- `Cache-Control: no-store`, generische Fehler, keine Payload-/DB-/Secret-Logs.
- Anonyme Beteiligung bedeutet keine verifizierte Ein-Person-eine-Stimme-Wahl.
  Eine neue zufällige UUID kann eine weitere Antwort ermöglichen. Lokale
  Erfolgssperre ist nur Komfort und umgehbar. Bei Auswertung immer von
  **Einsendungen**, nicht nachgewiesenen einzelnen Personen sprechen.
- Vor Veröffentlichung Aufbewahrung/Löschzeitpunkt und Datenschutzhinweis abstimmen.
  Es wird kein neues Tracking oder Account-Abgleich implementiert.

## Freigabe-/Release-Checkliste (nicht ausgeführt)

1. Inhalte und Landingpage lokal abnehmen; insbesondere Regionalbeispiele nicht
   als bereits feststehende Hallenteilnahme/-gruppen darstellen.
2. Retention, Transparenztext und Betriebs-/Missbrauchsrisiko freigeben.
3. Migration vor Produktion zusätzlich im realen Supabase-Testprojekt prüfen: valide/ungültige CHECKs,
   anon/authenticated Direktzugriff verweigert, inaktive/nicht-Admins RPC verweigert,
   aktiver Admin paginiert. Keine Tests in produktiven Antworten.
4. Nach expliziter Live-Freigabe nur die zwei genannten Migrationen kontrolliert anwenden und
   `submit-ideas-survey-2027` deployen (`verify_jwt=false`, kein Auth-Zwang).
   Keine unreviewten alten Migrationen mit pauschalem `db push` mitausführen.
5. Origin-/Byte-/Honeypot-/Retry-/Konfliktfälle am Testprojekt prüfen; danach
   öffentliche Website mit produktivem Submit freischalten. Preview wird nicht gespeichert.
6. Geschütztes Admin-RPC mit aktivem Liga-Admin read-only prüfen. Erst dann
   produktives Speichern als verifiziert melden.

Lokale Validierung: gemeinsame Payload-/Antwortvalidatoren sowie isolierte Handler-Tests mit gemocktem Deno-Serve, DB-Fetch und Runtime-Env; keine echten Netzwerkzugriffe. Hinzu kommen UI-, API-, Draft- und Einbettungstests. Aktuelle Abschlusszahlen stehen im gerätespezifischen Handoff.
Edge Function/Datenbankintegration sind ohne Testdatenbank-/Deploymentzugriff
noch nicht live verifiziert. Es werden keine Credentials für die lokale Vorbereitung benötigt.

Ergänzung Hauptprüfung: Beide vollständigen Migrationen wurden am 14.10.2026 lokal in einer flüchtigen PGlite-Datenbank ausgeführt; Einwilligungszwang, Nachweisimmutabilität, Besitzer-Widerruf/Retry, Constraints, private Rechte und aktive/inaktive Admins geprüft. Aktuelle Anzahl im Abschluss-Handoff.
`scripts/test-ideas-survey-sql.mjs` ist reproduzierbar mit vorhandenem lokalem
PGlite-Modulpfad. Im lokalen Datenschutzentwurf ist Einzelantwort-Löschung spätestens
31.03.2027 vorgeschlagen; Betreiberfreigabe/Löschprozess vor Live noch erforderlich.
