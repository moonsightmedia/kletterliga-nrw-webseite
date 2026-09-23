# Wettkampftag 2026: Umsetzungsvertrag

## Verbindliche Änderung vom 23.09.2026

Die folgende Ergänzung ersetzt ältere Entwürfe mit Startnummern, personenbezogenen
Schiedsrichter-Timern oder einer digitalen Bestätigung durch den Schiedsrichter.
Nutzerfreigabe: jetzt implementieren, auf sparsameren Sub-Agenten aufteilen.

### Aktuelle Umsetzung: Halbfinale

- Neue Tabellen und RPCs mit Präfix `competition_`; Qualifikation und Anmeldung
  werden weder migriert noch gelöscht oder wieder geöffnet.
- Die Liga-Administration richtet die physischen Routen ein (z.B. 12 oder 14).
  Jede bestätigte, angemeldete Klasse erhält genau fünf. Routen können geteilt
  werden. Angezeigt wird überall die echte Routennummer, keine zweite Nummerierung.
- Startklasse stammt aus `semifinal_eligibility`, Teilnahme setzt aktive Anmeldung,
  Freigabe und aktives Teilnehmerkonto voraus. Kein Neuberechnen nach Geburtsdatum.
- Punktwerte für Zonen 0–10 und Flash-Bonus werden explizit konfiguriert, nicht
  als sportliche Regel erfunden. Technischer Arbeitsstand: Zone 10 = TOP,
  Flash nur bei TOP. Vor erster Öffnung sportlich bestätigen.
- Teilnehmer wählt Ergebnis am eigenen Handy, scannt den Code beim Routenposten
  mit dem Scanner **in der App** und gibt das Ergebnis verbindlich ab.
  Zwischenspeicherung des Entwurfs im Browser, Erfolg nur nach Serverantwort.
- Statischer geheimer Routen-QR dient dem kurzen Kontakt, nicht einer signierten
  Schiedsrichterentscheidung. Er kann fotografiert/weitergegeben werden; das wird
  bewusst nicht als betrugssichere Kontrolle bezeichnet. QR nicht frei aushängen.
- Nach Abgabe ist das Ergebnis für Teilnehmer unveränderlich. Identische
  Wiederholung bleibt eine Abgabe. Orga-Korrektur braucht eine Begründung und Audit.
- Staffzugang pro Saison für bestehende App-Konten, keine zusätzliche globale
  Adminrolle. Staff bekommt nur QR-Codes und unabhängige Fünf-Minuten-Timer.
  Entzug des Zugangs macht bereits kopierte statische QR-Codes nicht ungültig.
- Timer verwenden Zeitstempel, überstehen Reloads und warnen zur letzten Minute
  und zum Ablauf. Browser-Alarme im Hintergrund/bei Displaysperre sind nicht
  garantiert; Bildschirm offen halten, unabhängige Uhr als Rückfall vor Ort.
- Orga öffnet und schließt die Eingabe bewusst. Erste Öffnung friert Konfiguration
  ein. Nicht automatisch zum Veranstaltungstag starten. Rangliste ist ein offener
  Zwischenstand, nicht automatisch eine bestätigte Finalstartliste.

### Oberflächen und technische Grenzen

- `/app/wettkampf`: persönliche Routen, Entwurf, Scanner, Abgabe, gespeicherte Werte.
- `/app/schiedsrichter`: geschützter Staffzugang, Timer und druckbare QR-Blätter.
- `/app/wettkampf/rangliste`: angemeldete Klassen, Punkte und Anzahl Eintragungen.
- `/app/admin/league/wettkampf`: Konfiguration, Helferzugänge, Öffnen/Schließen,
  Ergebniskorrekturen. Bereits vorhandene Anmeldung bleibt separat.
- Das Ein-Routen-Finale mit Schiedsrichtereingabe und noch offenen Zeit-/Tie-Break-
  Regeln ist **nicht** Bestandteil dieser Halbfinal-QR-Implementierung. Es wird
  nicht ersatzweise für Teilnehmer freigeschaltet.
- Design: bestehendes Stitch-System und `semifinal-design-contract.md`, dunkles
  Navy/Creme in der Teilnehmeransicht, ruhige Verwaltungsflächen, Terrakotta-CTA,
  große mobile Aktionen. Keine neuen Laufzeitabhängigkeiten. Schmale Ansicht
  einspaltig, mittlere/Desktopansicht nutzbare Raster, keine überbreiten Formulare.
- Sicherheitsgrenze: Browser ist untrusted. Authentifizierung, Rolle, Saison,
  Klasse, Route, QR, Phase, Werte und Eindeutigkeit werden in PostgreSQL geprüft.
  QR-Tokens niemals in offenen Routen- oder Ranglistenantworten.
- Migration zunächst lokal isoliert prüfen. Kein produktives Öffnen oder
  Überschreiben bestehender Daten als Teil des Entwicklungs-Tests.

Der folgende frühere Plan bleibt als Kontext erhalten; bei Widersprüchen gilt
die Ergänzung oben.

Stand 15.09.2026. Ablaufplanung vor Entwicklung; Nutzerangaben vom 15.09. erfasst.
Dieses Dokument ist der technische Vertrag im Code-Repository, kein zusätzliches
Aufgabenboard. Operativer Status bleibt auf der bestehenden Notion-Finaleseite.

## Ziel und bestehender Schutz

Angemeldete und freigegebene Teilnehmende können am Veranstaltungstag ihre
zugeordneten Halbfinalrouten sehen und Ergebnisse abgeben. Die Orga prüft,
korrigiert und veröffentlicht die Wertung. Das Finale erhält eine getrennte
Ergebnisaufnahme und Endplatzierungen.

Die laufende Halbfinalanmeldung und alle Qualifikationsdaten bleiben unverändert.
Keine Wiederöffnung der alten Ergebniseingabe, keine Wiederverwendung der alten
`results`-Tabelle für neue Runden. Kein automatisches Öffnen eines Wettkampfs durch
ein Datum, einen Frontend-Schalter oder die allgemeine `finale_enabled`-Einstellung.

## Bestätigte Quellen und Grenzen

- Git main `3fd694f`, nach frischem Fetch ohne Differenz zur Arbeitskopie.
- [Notion Finale 03.10.](https://app.notion.com/p/39e7b78fa6498052bc65dd9a04982677),
  live gelesen am 15.09.; letzter Bearbeitungsstand 08:09 UTC. Vorgesehen:
  eigene Handyeingabe im Halbfinale, Gegenkontrollliste der Schiedsrichter.
- `src/pages/Regelwerk.tsx`, §6: fünf Halbfinalrouten je Person, fünf Minuten
  Kletterzeit pro Route, Top 6 je Klasse ins Finale, eine Finalroute je Klasse.
- §4 beschreibt Zonen und Flash sowie beste Ergebnisse innerhalb der
  Qualifikationsphase. §10 enthält unter anderem den Zeitpunkt der Eintragung.
  Diese Regeln werden nicht ungeprüft auf den Veranstaltungstag übertragen.
- Separater Routenplan: zusätzliche physische Routen dienen der Entzerrung;
  weiterhin fünf zugeordnete Routen pro Klasse. Die Annahme eines einzigen
  Wertungsversuchs ist dort ausdrücklich noch zu bestätigen. Veraltete
  Teilnehmer-/Alterszahlen aus früheren Planständen nicht übernehmen.
- Minutengenauer Zeitplan, Check-in und Ausrüstungshinweise sind noch nicht
  bestätigt und dürfen nicht als feststehend veröffentlicht werden.

## Bestätigter sportlicher Arbeitsstand

### Halbfinale

- Jede Person klettert fünf der Klasse fest zugeordnete Routen.
- Pro Route stehen maximal fünf Minuten zur Verfügung. Der Routenposten kündigt
  die letzte Minute an.
- Jede Route hat zehn nummerierte Wertungsgriffe/Zonen. Es zählt der letzte
  sicher gehaltene Wertungsgriff. Hinzu kommt ein Flash-Bonus.
- Die Teilnehmenden dürfen sich gegenseitig zusehen; keine Isolation.
- Die Ergebnisse sind offen einsehbar.
- Bei Gleichstand um den Finaleinzug ziehen alle Punktgleichen ins Finale ein;
  das Finalfeld kann dadurch mehr als sechs Personen einer Klasse enthalten.
- Für das Halbfinale muss jede teilnehmende Person die Sicherung selbst
  organisieren: entweder eine eigene geeignete Sicherungsperson mitbringen oder
  sich durch andere geeignete Teilnehmende sichern lassen. Die Orga stellt im
  Halbfinale kein Sicherungspersonal. Anforderungen, Partnercheck und
  Versicherung bleiben konkret festzulegen.

### Finale

- Eine Finalroute pro noch festzulegender Klassen-/Routengruppe, maximal fünf
  Minuten. Jeder Wertungsgriff wird nummeriert; der Schiedsrichter kündigt die
  letzte Minute an und trägt das Ergebnis ein.
- Gemeinsame fünfminütige Besichtigung der jeweiligen Gruppe; anschließend
  Isolation. Die Route ist vorher unbekannt.
- Startreihenfolge umgekehrt zum Halbfinalranking: niedrigster Finalrang zuerst,
  bester Halbfinalrang zuletzt.
- Bei gleicher Finalwertung soll die gestoppte Zeit herangezogen werden; weitere
  Tie-Break-Faktoren sind noch festzulegen.
- Welche Klassen eine Finalroute oder Gruppe teilen, wird nach dem Routenbau
  festgelegt.

## Vor Entwicklung noch zu präzisieren

1. Bedeutet „zehn Zonen“ exakt zehn nummerierte Wertungsgriffe mit den Werten
   1–10 und ist TOP gleich 10, oder ist TOP eine zusätzliche Wertung?
2. Höhe des Flash-Bonus; naheliegender Anschluss an die bestehende
   Qualifikationsregel wäre +1 nur bei TOP im ersten Versuch.
3. Sind innerhalb der fünf Minuten beliebig viele Versuche erlaubt? Für einen
   sinnvollen Flash-Bonus wird im Ablaufentwurf davon ausgegangen; noch bestätigen.
4. Finale: ein Versuch; Definition „gehalten“ und optional „+“ für eine aktive
   Weiterbewegung; Start-/Endzeitpunkt der Zeitmessung.
5. Finale bei gleicher Griffwertung: Nur TOP-Zeit direkt vergleichen. Bei
   gleichem nicht getopptem Griff zuerst Halbfinalranking oder geteilten Platz
   verwenden, damit ein schneller Sturz nicht belohnt wird. Abschließend festlegen.
6. Einspruchsfenster, technische Zwischenfälle, DNS/Abbruch und Befugnis zur
   endgültigen Korrektur.

## Geplanter Ablauf

1. Orga legt Eventrouten an und ordnet je Klasse fünf Halbfinalrouten zu.
2. Startfeld wird aus tatsächlichen Zusagen und gültigen Freigaben gebildet,
   nicht aus allen 148 Berechtigten. Falls Check-in gewünscht, ist Anwesenheit
   ein eigener Status und nicht gleichbedeutend mit einer Anmeldung.
3. Orga öffnet die Halbfinaleingabe ausdrücklich. Teilnehmende können nur eigene
   Ergebnisse zu den zugeordneten Routen in der geöffneten Runde abgeben.
4. Eingaben gelten zunächst als ungeprüft. Orga gleicht sie mit den
   Gegenkontrolllisten ab; Korrekturen und Bestätigungen bleiben nachvollziehbar.
5. Nach Schließen der Eingabe und Auflösen von Unklarheiten veröffentlicht die
   Orga die Halbfinalwertung. Erst bestätigte Resultate dürfen Finalplätze erzeugen.
6. Orga bestätigt das Finalfeld anhand der vereinbarten Gleichstandsregel.
   Danach getrennte Finalerfassung und Veröffentlichung der Endwertung.

## Empfohlener Ablauf mit eigener Handyeingabe

1. Beim Check-in erhält jede Person Startnummer, Klasse und ihr Fünfer-Routenset.
   Die App zeigt nur dieses Set; ein QR-Code an jeder Route öffnet die passende
   Eingabe. Das Zuschauen und die vorläufige Ergebnisübersicht bleiben offen.
2. Ein fester Routenposten je gleichzeitig geöffneter Route prüft Startnummer,
   startet die offizielle Fünf-Minuten-Uhr, kündigt die letzte Minute an und
   beobachtet höchsten Wertungsgriff sowie Flash. Der Sichernde ist nicht zugleich
   Routenposten.
3. Nach dem Versuch trägt die Person 0–10/TOP und Flash am eigenen Handy ein und
   zeigt die Zusammenfassung. Der Routenposten bestätigt mit kurzem Scan/Tipp oder
   kennzeichnet eine Abweichung. Erst dann erhält das Ergebnis den Status „bestätigt“.
4. Eine routebezogene Papierliste dient nur als offizielles Notfall- und
   Gegenkontrollprotokoll: Startnummer, Wertung, Flash, Kürzel, Vorfall. Keine
   zusätzliche individuelle Papierscorecard erforderlich.
5. Bei Netz-/App-Ausfall wird auf der Stationsliste weitergewertet. Das Ergebnisbüro
   erfasst die Blätter später mit Vier-Augen-Kontrolle; niemand verliert deshalb
   einen Versuch.
6. Nach Schließen der Runde zeigt die App offene Abweichungen. Wettkampfleitung
   klärt sie mit Stationsliste, sperrt die Runde und veröffentlicht erst danach die
   offizielle Rangliste sowie Top 6 plus alle Punktgleichen am Grenzplatz.

## Personal- und Kapazitätsempfehlung

Der vorhandene Routenentwurf hat 16 Routen (acht Toprope, acht Vorstieg) und bis
zu 52 Wertungen auf der vollsten Route. Bei 6,5 Minuten je Slot benötigt diese
Route rund 5:38 Stunden. Damit der Arbeitsrahmen 09:00–16:00 funktioniert, sollten
alle 16 Linien gleichzeitig betreibbar sein.

- **Robust:** 16 Routenposten, zwei Springer/Pausenablösung, eine Wettkampfleitung,
  eine Person Ergebnisbüro sowie Check-in-Personal. Notfall-Sichernde werden
  separat nur für das Finale eingeplant. Routenposten benötigen eine kurze
  einheitliche Wertungsschulung, müssen aber nicht alle Daten eintippen.
- **Untergrenze:** zwölf gleichzeitig betreute Linien (sechs je Disziplin). Der
  bisherige Kapazitätsentwurf liegt dann für 142 Personen bereits bei etwa 7:45
  Stunden zuzüglich realer Verzögerungen und passt nicht sicher in 09:00–16:00.
- Nach Anmeldeschluss am 27.09. die Stationslast mit den tatsächlichen Zusagen neu
  rechnen. Erst dann können schwächer belegte Linien zeitweise zusammengelegt oder
  Routenposten in Schichten geplant werden.

Für das Finale je gleichzeitig gekletterter Route mindestens ein Routenschiedsrichter
und ein Zeitnehmer. Isolation/Call-Zone braucht eigene Betreuung. Die eigene
Sicherungsperson bleibt grundsätzlich vorgesehen; nur für die Finalroute stellt die
Orga im Notfall Sicherungspersonal. Eigene Sicherungspersonen dürfen dabei die
Isolation nicht durch beobachtete Versuche oder Kommunikation unterlaufen.

## Teilnehmermail – Entwurf, noch nicht versenden

**Betreff:** Du bist fürs Halbfinale startberechtigt – jetzt anmelden

Hallo {{Vorname}},

die Qualifikation der Kletterliga NRW 2026 ist beendet – und du bist für das
Halbfinale beim Finalevent startberechtigt. Herzlichen Glückwunsch!

Bitte bestätige deine Teilnahme bis spätestens **27.09.2026, 23:59 Uhr** in der
Kletterliga-App. Deine freigegebene Startklasse wird dir dort angezeigt. Ohne
rechtzeitige Anmeldung können wir deinen Startplatz nicht fest einplanen.

**Finalevent:** 03.10.2026

**Ort:** Kletterwelt Sauerland, Rosmarter Allee 12, 58762 Altena

**Anmeldung:** https://www.kletterliga-nrw.de/app

Am 3. Oktober kletterst du zunächst fünf Halbfinalrouten. Für jede Route stehen
dir maximal fünf Minuten zur Verfügung. Wenn du dich im Halbfinale für das Finale
qualifizierst, kletterst du anschließend noch eine Finalroute – ebenfalls mit
maximal fünf Minuten Kletterzeit.

Bitte beachte: Für deine fünf Halbfinalrouten musst du selbst für eine geeignete
Sicherung sorgen. Du kannst entweder eine eigene Sicherungsperson mitbringen oder
dich vor Ort mit anderen Teilnehmenden absprechen und von ihnen sichern lassen.
Im Halbfinale kann die Organisation keine Sicherung übernehmen. Wenn du dich für
das Finale qualifizierst, steht für die Finalroute im Notfall Sicherungspersonal
vor Ort zur Verfügung.

Die genauen Check-in- und Startzeiten sowie die Ausrüstungshinweise schicken wir
dir nach Abschluss der Anmeldung. Deine bisherigen Ergebnisse und Ranglisten
bleiben in der App einsehbar.

Wir freuen uns, dich beim Finalevent zu sehen!

Sportliche Grüße

Dein Team der Kletterliga NRW

Versand ausschließlich an die 148 freigegebenen echten Teilnehmenden; vor Versand
Empfängerliste erneut prüfen, Test-/Admin-/archivierte Konten ausschließen,
individualisiert oder datenschutzkonform per BCC/Mailsystem senden. Kein Versand
im Rahmen dieser Planung.

## Priorisierte Organisations-To-dos

- [ ] Teilnehmermail redaktionell freigeben und nur an die 148 Freigegebenen senden.
- [ ] Erinnerung vor dem 27.09. nur an noch nicht angemeldete Berechtigte vorbereiten.
- [ ] Nach Anmeldeschluss Zusagen, Absagen und Nachrückerbestand exportieren/prüfen.
- [ ] Halbfinal-Punktelogik einschließlich TOP, Flash-Bonus und Versuchsanzahl finalisieren.
- [ ] Finale-Tie-Break, Zeitmessung, „+“, technische Zwischenfälle und Einsprüche festlegen.
- [ ] Nach tatsächlichen Zusagen Routensets, Stationslast und Personal neu rechnen.
- [ ] 16 Routenposten plus Springer/Ergebnisbüro einplanen oder reduziertes Zeitmodell beschließen.
- [ ] Beschlossene Sicherungsregel konkretisieren: Anforderungen und Partnercheck
  fürs Halbfinale sowie Anzahl, Qualifikation und Versicherung der
  Notfall-Sichernden ausschließlich fürs Finale festlegen.
- [ ] 16 routebezogene Scorelisten plus zwei Reserveblätter/Klemmbretter vorbereiten.
- [ ] Routenposten-Briefing, Wertungstopos und Vorfall-/Korrekturprozess erstellen.
- [ ] Netztest in der Halle und Papier-Ausfallübung durchführen.
- [ ] Finalrouten-/Klassengruppen nach Routenbau, Sichtung, Isolation und Call-Zone festlegen.
- [ ] Bestätigte Regeln und Ablauf rechtzeitig auf Regelwerk/Eventseite veröffentlichen.
- [ ] Erst danach den App-Wettkampfmodus implementieren und mit einem vollständigen
  synthetischen Probe-Wettkampf testen.

## Technische Slices und Abnahme

### A: Getrennte Eventdaten und Rechte

Event, Runde, Klasse, Route/Klassenzuordnung, Startfeld und Eventergebnisse separat
modellieren. Versions-/Statusprüfungen und Berechtigungen auf dem Server, RLS mit
minimalen Leserechten, keine Client-Eskalation. Änderungen an offiziellen
Ergebnissen nur berechtigt und mit nachvollziehbarer Historie.

Abnahme: Teilnehmer A kann weder B lesen/schreiben, wo dies nicht ausdrücklich
öffentlich sein soll, noch Freigabe/Prüfstatus setzen. Falsche Klasse, fremde Route,
fehlende Anmeldung und geschlossene Runde werden serverseitig abgewiesen.
Qualifikationssperre bleibt wirksam. Tests isoliert mit synthetischen Daten.

### B: Routen und Teilnehmeransicht

Routenverwaltung mit Klassenzuordnung; Teilnehmer sehen nur ihr freigegebenes
Routenset und klar zwischen offen, abgegeben und bestätigt getrennte Zustände.
Die Rundenseite ergänzt die bestehende Anmeldung, statt sie vorzeitig zu ersetzen.

Abnahme: Touch-Bedienung, lange Texte, leere/falsche Konfiguration, fehlende
Berechtigung, langsame und fehlgeschlagene Anfragen; kein Erfolg vor Serverantwort.

### C: Kontrolle und Auswertung

Orga-Prüfliste, begründete Korrektur, Rundenabschluss und veröffentlichte Rangliste
nach dem bestätigten Wertungsformat. Export-/Papierablauf als Ausfallhilfe; kein
Versprechen automatischer Offline-Synchronisierung ohne Implementierung und Test.

Abnahme: gleichzeitige Änderungen, wiederholte Requests, leere/nicht gestartete
Route versus gewertete Null, vollständige Gleichstände, Grenzplatz 6 und kleine
Klassen mit weniger als sechs Startenden. Ungeprüfte Ergebnisse nicht als endgültig
darstellen. Keine personenbezogenen Kontaktdaten in öffentlichen Ranglisten.

### D: Finale und Release

Finalfeld, Finalroute und Orga-Ergebnisaufnahme entsprechend bestätigtem Format.
Separater Abschluss und Siegerübersicht. Regressionstests für Anmeldung und Archiv,
vollständiger Probe-Wettkampf mit synthetischen Daten und nachvollziehbarem Backup-
und Rückfallplan vor Produktivaktivierung. Keine Teilnehmermails automatisch senden.

## Design und Nicht-Ziele

Bestehende App-Referenz: `docs/stitch_design.md`, Navy/Creme/Terrakotta und vorhandene
Stitch/Radix-Komponenten. Nicht das abweichende Website-/Routenplaner-Design mischen.
Mobile zuerst; Prüfung auch bei 320px, Tablet und Desktop, Dialoge/Selects geöffnet,
Tastaturfokus, Lade-/Fehler-/Leerzustände. Keine neue Abhängigkeit erforderlich geplant.

Kein Umbau des Saisonrankings, keine Änderung von Geburtsdaten/Startklassen,
kein Teilnehmerimport auf Verdacht, kein automatischer Start des Wettkampfs und
keine Veröffentlichung unbestätigter Regeln oder Ablaufzeiten.
