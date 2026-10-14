# Ideen-Abstimmung 2027 – lokale Vorbereitung

Stand: 14.10.2026. Aktuellen Live-Release-Status in `docs/ideas-survey-release-2026-10-14.md` lesen. Backend inzwischen produktiv, alle weiteren Abschnitte dokumentieren überwiegend die lokale Vorbereitung. Keine echten Stimmen bei den Release-Tests; eigene synthetische Fixtures entfernt.

Erster Live-Release verwendet Einwilligung Version 2 mit Selbstauskunft ab 16 und automatischem Produktiv-Purge bis 31.03.2027. Version 1 blieb ausschließlich lokal. Popup-Design und Fragen bleiben wie abgenommen; Erklärung zu Backup-Retention in Datenschutzhinweisen ergänzt. Betreiber hat ausdrücklich vorhandenen Hobby-Tarif gewählt, ohne bestätigte Vercel-Ausnahme oder behauptete Rechtsfreigabe.

## Produkt und Quelle

- Auftrag: Auswahlbasierte Umfrage im aktuellen Kletterliga-Design, statt einer weiteren offenen Feedbackrunde; auf Janoschs bestätigten Wunsch in die bestehende 2027-Seite integriert.
- Führende Fragenquelle: [Notion – Feedback, Abschnitt Planung 2027](https://app.notion.com/p/3ef7b78fa6498091a845c6c84623a63f), gelesen am 14.10.2026, plus Erläuterungen von Janosch in diesem Chat.
- Einstieg `/saison/2027#ideen-2027` unter der bestehenden Interessensabfrage. `/ideen-2027` leitet clientseitig dorthin weiter. `/feedback-2026` bleibt unverändert; Interesse und Umfrage sind unabhängig.
- Basis: aktuelles `origin/main`, Commit `69ac8b1`; eigene Branch `codex/ideas-survey-2027`. Alte lokale Entwürfe nicht überschrieben.

## Designvertrag

Bestehende 2027-Seite ist der Rahmen; die Umfrage hat keinen zweiten Hero, kein zusätzliches Foto und keinen zweiten Header/Footer. Aktuellste Designkorrektur am 14.10.2026 nach Ablehnung des vorherigen mobilen Aufbaus: mobil ein durchgehender Foto-Hero mit gezieltem dunkelblauem Lesbarkeitsverlauf, beigefarbener Heavitas-Überschrift „2027. MIT DIR?“ und vollwertigem 56-px-Button „Ja, ich wäre dabei“. Der zusätzliche Interessenblock, generische Werbetext und zweite große Umfrage-CTA sind entfernt. „8 Themen. Deine Meinung.“ ist nur der kleine Scrollhinweis; die Umfrage ist unmittelbar der nächste Abschnitt. Auf Desktop bleiben Bild und Einladung zweispaltig. Alle Texte und Auswahlflächen sind native HTML/CSS, kein generiertes Bildlayout. Diese Revision betrifft ausschließlich Darstellung/Beschriftungen, nicht Umfrage-, Speicher- oder Backendlogik; noch durch Janosch abzunehmen.

Klares Ziel: Der Direktanker führt zum Abschnitt mit acht Themen und abschließender Antwortübersicht. Auf allen Bildschirmgrößen erscheint jeweils eine Frage einschließlich bedingter Unterfragen. Einzelantworten wechseln sofort weiter; Zurück bleibt möglich, auch erneutes Anklicken einer bereits ausgewählten Antwort führt weiter. Mehrfachauswahl und bewusst geöffnetes optionales Ideenfeld benötigen Weiter. Die abschließende Abgabe bleibt eine separate Bestätigung. Native Radio-/Checkbox-Gruppen, große Touchflächen, sichtbarer Tastaturfokus, Fehlermeldungen und Reduced Motion. Keine voreingestellten Meinungen oder abgefragten Kontaktdaten. Zwei optionale Ideenfelder mit maximal 500 Zeichen; nicht jede Frage bietet eine Unentschieden-Option.

### Mobile Einbettung am 14.10.2026 (bestätigt von Janosch)

- Umfrage als eigenständige Komponente unter `/saison/2027`, nicht als neue Landingpage.
- Direktanker und alter Link überspringen den bestehenden Einstieg, ohne das Interesse-Ja vorauszusetzen.
- Ursprünglich pro mobiler Ansicht eine Frage, inzwischen auf allen Größen; automatische Vorwärtsnavigation nach Einzelwahl und manuelles Zurück, gemeinsame Abschlussübersicht und identischer sicherer API-Vertrag.
- Antworten und Frageposition bleiben bei Layoutwechsel erhalten. Nach Weiter/Zurück wird direkt die Frage unter dem festen Header gezeigt, nicht erneut der gesamte Abschnittskopf.
- Mobile Aktionsleiste haftet unten auch bei langen Erklärungen. Nur auf dieser Seite verhindert `overflow-x:clip` statt `hidden` einen unsichtbaren Root-Scrollcontainer, der Sticky sonst blockiert.
- Interessenabfrage in DEV ebenfalls nur Vorschau (keine echte API, keine Browser-ID-Speicherung), Produktionsverhalten unverändert. Kein zweites Foto/Header/Footer.

### Frühere redaktionelle Kürzung am 14.10.2026 (vor der oben beschriebenen Hero-Korrektur)

Auf Janoschs Feedback zur hohen Textdichte hin vereinfacht: Hero nur „Ideen für 2027“, eine konkrete Frage und „Zur Abstimmung“. Allgemeine Werbesätze, Faktenzeile, Fototext, zusätzlicher Einleitungsblock sowie die acht Themen-Einleitungen und wiederholten Form-Fußnoten entfernt. Vorschauhinweis auf einen Satz gekürzt. „Mehrfachauswahl möglich“ bleibt nur bei Checkboxen. Foto kleiner und ohne Textüberlagerung. Fachlich nötige Erklärungen, eigentliche Fragen, Antwortoptionen, Datenschutz und Fehlerhinweise bleiben unverändert. Ziel: ein ruhiger direkter Einstieg statt mehrerer übereinanderliegender Botschaften; kein neues Designsystem.

## Fragebogen und Entscheidungen

| Thema | Auswahl / Unterfrage |
| --- | --- |
| Digital & Papier | Digitalisierung ja/nein/unentschieden; Papierkarten unabhängig davon ja/nein/unentschieden |
| Teammodus | Team- und Einzelwertung / nur Teamwertung / keine Teamwertung; bei Teamwunsch: zwei oder vier Personen |
| Liga-Shirt | verpflichtend / freiwillig / kein Shirt; Hinweis auf unbekannten Preis |
| Ligen & Klassen | Profi-Liga verpflichtend für Kader / freiwillig / keine; Erklärung separater Leistungswertung und eigener Podestplätze. Klassen: mehr Alters- / mehr Leistungs- / weniger / andere Unterteilung oder beibehalten; Mehrfachauswahl und optionaler Ideentext |
| Qualifikation | trotzdem stärker gewichten / nein, Kontrolle ist wichtiger; Hinweis auf selbst eingetragene Ergebnisse ohne durchgängige Schiedsrichterkontrolle |
| Hallen & Wege | alle Hallen / feste Regionalgruppe / freie Wahl / unentschieden; Umfang 4/6/8/10 Hallen |
| Community | Kick-off / während Saison / beides / keine Events / unentschieden |
| Wertung | keine Zusatzregel / eine Halle streichen / eine Halle doppelt / beides / unentschieden; optionaler Ideentext |

- Versteckte Unterantworten werden bei Elternwechsel gelöscht und serverseitig abgewiesen.
- Die kompaktere Auswahl folgt Janoschs ausdrücklichen Änderungen vom 14.10.2026. Team-, Shirt- und Profi-Auswahl setzen weiterhin eindeutige Eltern-/Kindfelder im bestehenden typisierten Speichervertrag; keine Information geht durch die Zusammenfassung verloren.
- Ein optionales Ideenfeld zu Klassen ist direkt sichtbar. Bei Wertungsregeln öffnet „Eigene Idee ergänzen (optional)“ das Feld vor der Auswahl. Wer es nicht öffnet, gelangt mit einem Antwortklick automatisch zur Übersicht. Geöffnete oder bereits ausgefüllte Ideen bleiben beim Zurückgehen zugänglich.
- Ideenfelder werden als Text dargestellt, nicht als HTML. Keine Namen oder Kontaktdaten eintragen; freiwilliger Text kann dennoch identifizierende Inhalte enthalten und bleibt wie alle Einzelantworten privat.
- Profi-Liga und „keine weiteren Änderungen an übrigen Klassen“ dürfen kombiniert werden.
- Hallenzahl bezeichnet Pflichtumfang, bei „alle Hallen“ die Größe der gesamten Runde. Regionbeispiele mit drei Hallen sind nur schematisch und könnten vergrößert werden. Partner, Gruppen und Regeln sind nicht zugesagt.
- Kostenfreier Hallentag ist nur eine Idee, kein mit Hallen vereinbartes Angebot.
- Keine laufenden öffentlichen Ergebnisse, um Antworten nicht durch vorherige Stimmen zu lenken.

## Lokale Vorschau

Arbeitsordner: `C:/Users/Janosch/Desktop/Kletterliga NRW/ideas-survey-2027`.

`npm run dev -- --host 127.0.0.1 --port 5417 --strictPort`

URL: `http://127.0.0.1:5417/saison/2027#ideen-2027`; alte URL `/ideen-2027` führt ebenfalls dorthin. Jeder DEV-Start ist automatisch Vorschau: beide Abstimmungen speichern nichts. Produktionsbuild verwendet die echte API. Explizites `preview={false}` kommt nur in isolierten Tests vor.

Die lokalen Dependencies werden über eine Junction aus dem bestehenden `season-recap-preview/node_modules` wiederverwendet. Eine zuvor angelegte Junction zum älteren Hauptrepo wurde recoverbar als `node_modules-primary-cache` behalten und ist git-ignoriert. Kein Paketwechsel, keine Installation.

## Datensicherheit / Einschränkungen

### Einwilligungsstart und Widerruf (aktuelle Revision)

Aktuellste Präsentationsrevision: Einwilligung als kompaktes Radix-Dialog-Popup über der ersten sichtbaren, deaktivierten Frage. Automatisch beim Erreichen des Umfrageabschnitts; nicht schon im Hero. Kreuz, Escape und Hintergrundklick schließen ohne Zustimmung; „Umfrage starten“ öffnet erneut. Tastaturfokus bleibt im Modal und kehrt beim Schließen zum Trigger zurück, nach Zustimmung zur Frage. Kurzfassung vor dem Zustimmungsbutton, Datenschutz-/Widerrufslinks und Details darunter. Text, Version 1 und Speicherungssperren bleiben unverändert. Die folgenden Inline-Beschreibungen dokumentieren den ersetzten Zwischenstand.

Kompaktere Darstellung auf Janoschs Wunsch: zusätzlicher großer Titel entfernt, kurzer 13-px-Hinweis zu Verantwortlichem/Zweck/Teilantworten/Freiwilligkeit direkt vor dem gut antippbaren Startbutton. Vollständiger unveränderter Einwilligungstext, Details und Datenschutz-/Widerrufslinks darunter. „Nicht teilnehmen“ entfernt; wer nicht startet, übermittelt keine Umfrageantworten. Direkt darunter erste Frage als dieselbe echte Form sichtbar, jedoch bis zum ausdrücklichen Start nativ deaktiviert; kein vorgezogener Save, keine voreingestellten Antworten. Vor dem Start kein großer Fortschritts-/Themenblock, nach Start normale Navigation. Einwilligungs-Gate bleibt auch in Hook/API/SQL; kein Backend-/Versionswechsel bei dieser Präsentationsänderung.

Vor der bereits sichtbaren ersten Frage steht ein kompakter freiwilliger Einwilligungsstart im vorhandenen Design. „Einverstanden – Umfrage starten“ schaltet die Antwortmöglichkeiten frei. Wer nicht startet, übermittelt keine Antworten. Auch der Start alleine sendet noch keinen Request. Erst mit der ersten Antwort werden Einwilligung Version 1 und die Antworten übermittelt. Der serverseitige erste Empfang wird unveränderlich als `consent_recorded_at` dokumentiert (nicht als behaupteter genauer Zeitpunkt des Klicks). Textfassung ist in `src/lib/ideasConsent2027.ts` und `docs/ideas-survey-consent-v1.md` archiviert. Zweck-/Textänderungen erfordern eine neue Version.

Hook, API-Validator und SQL verlangen für Draft/Complete die aktuelle Einwilligung. Der alte öffentliche Prototype-Submit ohne Bearbeitungsschlüssel wurde stillgelegt, statt die Einwilligung zu umgehen. Keine nachträgliche Einwilligung für bestehende Daten unterstellen; die zwei noch nicht veröffentlichten lokalen Migrationen setzen einen neuen, leeren Umfragespeicher voraus. Vor Deployment gegen tatsächlichen Schema-Stand prüfen.

„Einwilligung widerrufen & Antworten entfernen“ funktioniert direkt mit einem Klick während und nach Abschluss der Umfrage. Keine erneute Einwilligung für Löschung. Ein vertraulicher Widerrufscode kann als lokale Textdatei heruntergeladen und nach Schließen/Reload auf `/ideen-2027/widerruf` eingegeben werden. Der Code enthält UUID und zufälligen Bearbeitungsschlüssel, ermöglicht Löschen und darf nicht geteilt werden; nicht URL/Logs/Storage. Die Seite ist noindex und von Seitenanalyse ausgeschlossen. Ohne gesicherten Code keine sichere Wiederzuordnung; keine zusätzliche Identität nur zur Wiederidentifizierung abfragen. Dies ist eine datensparsame technische Widerrufsmöglichkeit, keine vollständige rechtliche Freigabe.

Rechtsgrundlage der Umfrage im lokalen Datenschutzhinweis ist jetzt freiwillige Einwilligung nach Art. 6 Abs. 1 lit. a, nicht mehr der frühere Interessenabwägungsentwurf. Technische Sicherheits-/Hostingverarbeitung separat beurteilen. Wirksamkeit der Einwilligung einschließlich Minderjähriger, Betreiberangaben, AV/Regionen/Transfers/Logs sowie Retention/Löschprozess weiterhin vor Live prüfen.

Eigene private Tabelle `ideas_survey_2027`, strikte JSON-Enums und private Admin-RPC. Keine Session-Authorization aus dem Browser, keine Profil-ID. Jede Auswahl startet sofort eine Speicherung des aktuellen Antwortsatzes. Optionale Texte speichern nach 400 ms Schreibpause sowie beim Verlassen des Feldes/Weiter; kein POST pro einzelner Taste. Beide bekannten Textfelder werden in API und SQL auf Typ, Länge und Steuerzeichen geprüft, normalisiert und leere Texte ausgelassen. Zufällige Antwort-ID und 256-Bit-Bearbeitungsschlüssel nur im Seitenspeicher; DB speichert ausschließlich den Schlüsselhash. Keine eigenen Umfrage-Cookies oder localStorage. Atomare Revisionen verhindern das Überschreiben neuerer Antworten durch verspätete Requests. Bereits gestartete Requests verwenden `keepalive`, ohne zusätzliche Unload-Ereignisse oder Tracking. Fehler-/Erneut-speichern-Status; niemals Erfolg vor bestätigtem Serverergebnis. DEV bleibt ohne echte Speicherung.

Unvollständige und abgeschlossene Antworten werden getrennt ausgewiesen. Fehlende Antworten werden nicht als „Nein“ oder „unentschieden“ gespeichert. Vollständiger Abschluss validiert weiterhin alle sichtbaren Pflichtfragen. Wiederholung behält UUID, Schlüssel und Revision; nach einem fehlgeschlagenen Abschlussversuch bleibt die Bearbeitung bis zur identischen Bestätigung gesperrt. Widerruf leert die Antwortdaten und setzt einen nicht auswertbaren Tombstone, damit verspätete Requests nichts wiederherstellen. Löschen nutzt Revision 10000, auch bevor verspätete Drafts eintreffen; Besitzer-Retry bleibt bei bereits gelöschten Antworten erfolgreich. Nach Reload kein Wiederaufnehmen; Löschen ist mit zuvor gesichertem Code möglich. Eine weitere Einsendung ist technisch möglich, keine Behauptung eindeutiger Personen. API-Admins erhalten weder Schlüssel noch Hash.

Honeypot, Größen-/Zeitgrenzen und best-effort In-Memory-Rate-Limit bleiben, keine IP-Antwort-Verknüpfung im Anwendungscode. Kein starker Bot-/Ein-Person-eine-Stimme-Nachweis ohne Login. Seitenanalyse/Performance-Messungen auf beiden Umfrage-Einstiegsrouten ausgeschlossen (initial kein SDK-Mount, bereits geladene SDKs über `beforeSend` gefiltert). Dies entfernt keine technischen Hosting-Zugriffe und ist noch produktiv zu verifizieren.

Eigener lokaler Datenschutzhinweis ergänzt. Vorgeschlagene Aufbewahrung: Einzelantworten nach Planung löschen, spätestens 31.03.2027 (analog bestehendem Saisonfeedback); nur aggregierte Ergebnisse danach behalten. Diese Frist vor Launch durch Janosch bestätigen und Löschprozess festlegen. Es ist noch keine Löschautomation eingerichtet.

### Frühere Datenschutzprüfung und verbleibende Gates / ausdrücklich kein Rechtsgutachten

Am 14.10.2026 aktuelle Primärquellen gelesen: [TDDDG § 25 / Gesamtausgabe](https://www.gesetze-im-internet.de/ttdsg/BJNR198210021.html) und [DSK OH Digitale Dienste, November 2024](https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf), insbesondere Randnummern 64–81, 100–110 und 138–142. EUR-Lex-Direktabruf der DSGVO war durch Bot-Prüfung blockiert; keine Umgehung. Art. 6 und Art. 13 wurden über die offizielle DSK-Erläuterung geprüft.

- Ein Formular erfordert nicht automatisch einen Cookie-Banner. § 25 betrifft Speicher-/Lesezugriffe auf Endgeräte, auch außerhalb von Cookies und unabhängig vom Personenbezug. Die Ausnahme für unbedingt erforderliche, ausdrücklich gewünschte Dienste ist eng; „kein Cookie“ allein genügt nicht als Begründung.
- Serververarbeitung personenbezogener/zuordenbarer Daten benötigt eine passende Rechtsgrundlage und Informationen zum Erhebungszeitpunkt. Kein Namensfeld ist kein Beweis vollständiger Anonymität, insbesondere mit Hosting-Metadaten.
- Vor der ersten Auswahl steht jetzt ausdrücklich, dass jede Antwort sofort und auch unvollständig ausgewertet wird. Die Datenschutzhinweise beschreiben Zweck, Daten, Berechtigungen, Teilantworten, Schlüssel, Löschung und Widerspruch. Der Hinweis ist keine fingierte Einwilligung.
- Der frühere Art.-6(1)(f)-Betreiberentwurf wurde auf Janoschs Wunsch durch den oben beschriebenen freiwilligen Einwilligungsstart ersetzt. Ein Startbutton allein garantiert keine wirksame Einwilligung; Bedingungen, Transparenz und Widerruf sind tatsächlich zu prüfen.
- Offene Release-Gates: Einwilligungswirksamkeit einschließlich Minderjähriger, tatsächliche Hosting-/Supabase-Auftragsverarbeitung und Drittlandbedingungen/Logs, korrektes Hosting-Land statt des bisherigen pauschalen Deutschland-Texts, bestätigte Löschfrist plus Prozess. Bestehende separate Interessenabfrage verwendet unverändert localStorage (`kl-interest-2027`); deren §-25-Grundlage ist gesondert zu prüfen, ggf. minimieren oder wirksame Einwilligung vor Speicherung. Die Umfrage nutzt diese Kennung nicht.
- Ein Livegang ist deshalb noch nicht rechtlich freigegeben. Keine Antwortdaten aus Produktion gelesen oder verändert; keine produktiven Teststimmen.

## Verifikation

- Popup-Revision: Mobile 320 × 568 und 390 × 844, Tablet 768 × 1024 und Desktop 1440 × 900 visuell geprüft. Kleine Ansicht mit geöffneten Details bleibt innerhalb des Viewports und intern scrollbar; keine horizontalen Überläufe. Schließen per Kreuz/Escape/Hintergrund, Wiederöffnung, Fokusbindung, explizites Freischalten und automatischer Fragewechsel geprüft. DEV ohne echte Stimmen.
- Aktueller Abschluss der Popup-Revision: 107 Testdateien / 544 Tests erfolgreich; Produktionsbuild, gezieltes ESLint und `git diff --check` bestanden. `IntersectionObserver`-Teststub jetzt konfigurierbar, damit Popup-Tests den Eintritt in den sichtbaren Bereich kontrolliert simulieren können. Keine Produktionsabhängigkeit verändert.

- Browser: Desktop 1440, Tablet 768, Mobile 390 und 320 px; keine horizontalen Überläufe, echte Assets geladen. Kompletter Acht-Themen-Weg inklusive aller Ja-Unterfragen, Mehrfachauswahl, Regionbeispiel und lokaler Erfolg durchgeführt.
- Spezifische Tests: gemeinsame Validatoren, mockbasierter Edge Handler, UI, API, Einbettung, automatischer Wechsel/Zurück, bedingte Fragen, optionale Texte, sofortige Draft-Requests, Konflikte/Retry/Löschung und Telemetrie-Ausschluss (kein externer Write). Aktuelle Zahlen im Abschluss-Handoff.
- SQL: beide vollständigen Migrationen in isoliertem PGlite, 43 Prüfungen inklusive Einwilligungszwang, unveränderlichem erstem Einwilligungsempfang, Textvalidierung, privaten Rechten, Schlüsselbesitz, Revisionen, Widerruf bei Maximalrevision, Lösch-Retry und RPC nur für aktive Liga-Admins mit getrennten Teil-/Vollzahlen.
- Produktionsbuild inklusive bestehendem statischem SEO-Skript; gezieltes ESLint und `git diff --check`.
- Gesamtsuite nach Einwilligungs-/Widerrufs-Ergänzung: 107 Dateien / 541 Tests erfolgreich. Build, gezieltes ESLint und `git diff --check` ebenfalls bestanden. Globaler Typecheck weiterhin bekannte Altfehler, kein Fehler in betroffenen Umfrage-Dateien.
- Browser nur bestehende React-Router-Zukunftswarnungen und absichtlich fehlende lokale Supabase-Konfiguration. Kein API-Liveziel im Vorschauablauf.
- Vollständiger Typecheck enthält vorhandene Fehler in `appApi`, `printableCodeSheet` und alten Test-Mocks; keine Fehler in den neuen Umfrage-Dateien nach Korrektur der neuen Tests. Deno-Runtime nicht installiert; Edge Handler unter Vitest isoliert, noch kein realer Supabase-Deploytest.

Screenshots: `C:/Users/Janosch/Desktop/Kletterliga NRW/output/ideen-2027-2026-10-14/`.

## Veröffentlichung – noch separat freizugeben

1. Janosch prüft Fragen, Beispiele, lokale Seite und die vorgeschlagene Aufbewahrungsfrist.
2. Vor Freigabe obige Datenschutz-Gates schließen. Beide Migrationen gegen tatsächlichen aktuellen Produktionsschema-Stand prüfen und kontrolliert ausrollen; Function mit JWT-Prüfung aus deployen, Originliste nicht auf Wildcard erweitern.
3. Function-Runtime, Datenbankrechte und aktiven Admin-Zugriff end-to-end prüfen; Teststimmen als solche dokumentieren und nur ausdrücklich autorisiert entfernen.
4. Frontend samt Datenschutzhinweis deployen; echte Speicherung/Retry, Mobile und Links auf Produktionsdomain verifizieren. Die Umfrage ist in der bestehenden kanonischen 2027-Seite eingebettet; kein neues indexierbares Seitenduplikat oder Sitemap-Eintrag.
5. Öffnungs-/Schlussdatum und Löschtermin vereinbaren. Einbindung im Admin-Dashboard/öffentliche Auswertung ist nicht Teil dieses Landingpage-Auftrags; vorhandene private RPC ist dafür vorbereitet.
6. Erst danach Link verbreiten; Versand und Social-Posting bleiben eigene Aufträge.

Backenddetails: `docs/ideas-survey-backend.md`. SQL-Testscript: `scripts/test-ideas-survey-sql.mjs` mit vorhandenem lokalem PGlite-Modulpfad als Argument ausführbar, ohne Netzwerk.
