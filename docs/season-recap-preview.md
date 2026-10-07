# Lokaler Saisonabschluss-Entwurf

Eigenständige Vorschau im vorhandenen React/Vite-Stack und Kletterliga-Design.
Die produktive Website und ihre Daten bleiben unverändert. Einstieg und Build
sind von der normalen App getrennt; keine Analytics. Die Vorschau liest einen
lokalen Snapshot der bereits öffentlich verfügbaren Ergebnisse, ohne App-Login.

## Starten

```powershell
node node_modules/vite/bin/vite.js --config vite.season-preview.config.ts
```

Adresse: http://127.0.0.1:5390/

- `/`: Saisonabschluss, Fotoauswahl und Ausblick.
- `/saison/2026`: Nachbericht-Entwurf, acht beteiligte Hallen, Fotos und Sponsoren.
- `/ergebnisse/2026`: echte öffentliche Ergebnisse mit Liga-/Klassen-/Phasenfiltern.
- `/saison/2027`: unverbindliche Interessensfrage mit „Ja.“ und Bestätigung.
- `/archiv`: vorbereitete Grundlage, aktuell nicht in der Navigation.

## Konzept und offene Inhalte

Bestehende Farben #003D55, #A15523 und #F2DCAB, Heavitas-Schrift und schräge
Elemente. Nach Nutzerfeedback am 06.10.2026 enger an die alte Website angepasst:
großes Logo im beigen Einstieg mit Papiertextur und diagonalen Streifen,
vertraute Statistikflächen, gleiche Buttonformen, zentrierte Sektionsüberschriften
und Karten. Echte Fotos erscheinen im Rückblick und in der Galerie.
Der SponsorBanner wird direkt aus der bisherigen Website übernommen; Header
und Footer sind Vorschaukopien der bisherigen Komponenten mit angepassten Links
für abgeschlossene Saison und Ausblick. Produktive Komponenten unverändert.

Die 2027-Antwort ist ausdrücklich keine Anmeldung und keine Verpflichtung.
Der Button merkt die Antwort nur im React-Zustand bis zum Neuladen vor und
verhindert anschließend weitere Klicks in dieser Ansicht. Es gibt noch keinen
serverseitigen Zähler und keine persistente oder eindeutige Besucherzählung.

Öffentliche Ergebnisdaten am 06.10.2026 ausschließlich über anonyme vorhandene
Endpunkte gelesen und als Snapshot in `src/preview/data/season-2026.json`
abgelegt. 11 Finalklassen im Status final, 58 Finale-Einträge (inklusive DNS),
75 Halbfinaleinträge und 148 Qualifikationseinträge. Alle 12 Qualifikationsklassen
liegen unter dem bestehenden API-Limit von 50; keine Klasse wird abgeschnitten.
Export prüft Saisonzeitraum 2026, Finalfreigabe und Limit vor dem Speichern.
Keine privaten IDs, Kontaktinformationen, Login-Sessions oder Schlüssel im
Snapshot. Keine Schreibzugriffe auf Supabase. Publikation/Freigabe dokumentiert
in Handoff vom 04.10.2026 23:08; zuvor zitierter offener Prüfstand war veraltet.
Snapshot statt globaler Live-Saison verhindert Wechsel zu 2027-Ergebnissen.

Der externe Galerie-Link https://apps.scrappbook.de/H1uPsyZjzg ist eingebunden
und im Browser als „Kletterliga Halbfinale & Finale“ geprüft. Die Promocode-
Konditionen fehlen noch und sind als offen markiert. Nachbericht enthält nur
bekannte Eckdaten; persönliche Highlights und Zahlen sind noch zu ergänzen.
Danke richtet sich an Community und Beteiligte, zusätzlich an den im Code
bestätigten Hauptsponsor kletterladen.nrw; der genaue Sonderwunsch bleibt offen.

## Bilder

Zehn WebP-Versionen aus Justus Hoehns neuer NAS-Serie, maximal 1920 Pixel.
Originale unverändert. Zuordnung und Größen im Asset-Manifest.
Fotos: Justus Hoehn / @justus.films.

## Verifikation am 06.10.2026

- Vorschau-Build und gezieltes ESLint bestanden.
- Desktop, Tablet (820×1180) und Mobile (390×844) im echten Browser angesehen.
- Mobiles Menü, Saisonlinks, Ergebnisanker und Filter geprüft.
- „Ja.“ zeigt Bestätigung und wird deaktiviert; Hinweis bleibt sichtbar.
- Bilddialog öffnet, fokussiert Schließen und schließt per Escape.
- Alle sichtbaren Bilder geladen; kein horizontaler Überlauf bei geprüften Größen.
- React- und Router-Warnungen beim ersten Lauf korrigiert.
- Browser-Screenshots unter `docs/screenshots/season-preview`.

Die Bilderaufnahme des Browserwerkzeugs hatte vereinzelt Timeouts; die
DOM-Prüfung funktionierte weiterhin. Kein vollständiger Produktions- oder
Accessibility-Audit. Keine neue Abhängigkeit installiert.

Revision 2 übernimmt den vertrauten Seitenrahmen und ersetzt die großformatige
geteilte Foto-Startseite. Der Nachbericht, die Ergebnisfilter, Bilddialoge und
unverbindliche 2027-Frage bleiben erhalten. Externe Infoseiten in der Navigation
führen zur bestehenden Website; es wurden keine Duplikate der Ligaregeln gebaut.

## Isolation

Worktree `codex/season-recap-preview`, Ausgangspunkt `origin/main` daa2d70.
Vorher frischer Fetch. Die älteren, geänderten Arbeitskopien wurden nicht
überschrieben. Lokale node_modules-Junction nutzt die vorhandenen Abhängigkeiten.

Nächster Schritt: Revision 4 lokal gemeinsam ansehen; danach fehlenden
Promocode und Konditionen ergänzen. Kein Deployment erfolgt.

Revision-2-Prüfung: Build und ESLint nach letzter Navigationskorrektur bestanden.
Desktop 1536×960, Tablet 820×1180 und Mobile 390×844 angesehen.
Mobile Navigation zur Saison 2027 schließt das Menü; Ja-Bestätigung bleibt
unverbindlich. Galerieanker, Bilddialog und Escape geprüft. Keine defekten
sichtbaren Bilder oder horizontaler Überlauf bei geprüften Ansichten.
Aktuelle Screenshots: desktop-home-revision2.jpg und mobile-home-revision2.jpg.
Origin/main enthält inzwischen fc64b5d (private Feedback-Verwaltung); diese
unabhängige Änderung wurde nicht in den lokalen Gestaltungsentwurf übernommen.

Revision 3: Haupt- und Footernavigation reduziert auf Start, Saison 2026,
Ergebnisse und Ausblick 2027. Modus/Regeln, Hallen, Finale, Sponsoren und Archiv
sind keine eigenen Navigationspunkte. Sponsoren und Hallen unter Saison 2026.
Die Startseite bleibt gestalterisch erhalten; eigener Sponsorblock entfällt dort.
Der alte Teilnehmerbereich-Link ist entfernt; Ergebnisse verlangen keinen Login.
Repositoryweiter TypeScript-Check meldet Fehler in unveränderten App-/Testdateien,
keine in den Vorschaukomponenten. Lokaler Vite-Build, ESLint und 5 bestehende
Tests für anonymen Wettkampfergebniszugriff bestanden.
Revision-3-Browserprüfung: Desktop und Mobile der öffentlichen Ergebnis-Seite, alle drei Phasen sowie Liga-/Klassenwechsel geprüft. DNS ohne Platz und AW-Kennzeichnung korrekt. Keine Login-Links, kein horizontaler Seitenüberlauf. Mobile Navigation zur Saison schließt das Menü; alle acht Hallen im Desktop-Raster visuell geprüft. Screenshots public-results-desktop.jpg und public-results-mobile.jpg.

## Revision 4 – Fotos, Sponsoren und Mobile

Neuer Start-Hero mit „Was für eine Saison“, echtem Kletterfoto und direktem
Ergebnislink. Papiertextur, Farben, Heavitas und schräge Buttons bleiben erhalten.
Der Saisonrückblick nutzt ein neues Siegerehrungsfoto. Drei zusätzliche NAS-
Aufnahmen: Start 550, Rückblick 640 und Ausblick 415, alle von Justus Hoehn.
Der Ausblick 2027 verbindet die unverbindliche Frage mit einem ausdrücklich als
2026 gekennzeichneten Foto. Der öffentliche Zähler bleibt eine spätere Aufgabe.

Kletterladen bekommt einen eigenen zweigeteilten Hauptsponsorbereich mit
Original-Logo, Link und offenem Code-Feld. Alle sechs weiteren Partner aus den
bestehenden Sponsorendaten erscheinen mit Original-Logos; weiße Logos erhalten
blauen Hintergrund. Keine Rabattwerte oder Partnerdaten erfunden.

Responsive Prüfung: Desktop 1536×960, Tablet 820×1180, Mobile 390×844 und
kleine Ansicht 320 Pixel. Auf Mobile Foto vor Starttext, große Buttons,
gestapelte Sponsorenfläche und zweispaltiges Logoraster. Intrinsische Breite
der Sponsorenfläche bei 320 Pixel korrigiert. Kein geprüfter horizontaler
Seitenüberlauf. Mobiles Menü zur Saison 2027 schließt korrekt; Ja-Bestätigung
wird deaktiviert und der Unverbindlichkeitshinweis bleibt sichtbar.
Original-Logos und neue Bilder vollständig geladen. Galerie-Ziel geprüft.
Finaler Build und gezieltes ESLint nach letzter CSS-Korrektur bestanden.
Aktuelle Screenshots: home-photo-revision4.jpg, home-mobile-revision4.jpg,
sponsor-logos-revision4.jpg, next-photo-revision4.jpg und next-mobile-revision4.jpg.
Feedback und Galerie-Link in der bestehenden Notion-Feedbacksammlung ergänzt.

## Revision 5 – eigenständige Fehlerprüfung

Bestätigte Bedienfehler und Korrekturen:
- Mobile Navigation verdeckte den eigenen Schließen-Button; Fokus konnte in die
  verdeckte Seite gelangen (wesentlich für Tastaturbedienung). Bestehendes Radix-
  Dialog-Primitive integriert: sichtbares Schließen, Fokusbegrenzung, Escape,
  Rückkehr zum Menütrigger und Freigabe beim Wechsel zur Desktopbreite.
- Galerie verlor nach Escape den Fokus auf BODY (kleiner Bedienfehler).
  Fokus kehrt zum auslösenden Foto zurück. Portal-Buttons hatten außerdem keine
  Vorschau-Farbtokens und keinen eigenen Fokusstil; explizite Portalstile ergänzt.
- 2027-Links im Header luden die Seite neu und setzten ein lokales Ja zurück
  (kleiner Funktionsfehler). Router-Links erhalten die Antwort bei Navigation.
- Lange Ja-Bestätigung vergrößerte den Button auf schmalen Displays; Buttonhöhe,
  Bestätigungstypografie und reservierter Statusbereich stabilisiert.

Verbesserungen: Galerie mit Vor-/Zurück-Buttons, Bildzähler und Pfeiltasten;
Ergebnisfilter mit mindestens 44 Pixel Touchhöhe, lesbarer Filtertypografie,
zugänglichem Tabellen-Scrollbereich und Statusansage; individuelle Seitentitel
und Fokus auf Seitenüberschrift beziehungsweise Sprungziel bei Navigation.
Sponsor-Laufbanner pausiert bei Hover/Fokus; reduzierte Bewegung respektiert.
Keine neue Abhängigkeit, kein Backend, keine Änderung der Ergebnisdaten.

Browsernachweise: 36 Kombinationen (3 Phasen × 2 Ligen × 6 Klassen) bei 320 Pixel
ohne Seitenüberlauf, NaN/undefined oder unerklärte leere Anzeige. Zwei Kombinationen
haben einen erklärten Leerzustand. Mobile Menünavigation, Shift+Tab-Fokusbegrenzung,
Escape, Fokusrestauration, Desktopwechsel ohne Scrollsperre und Antworterhalt
beim Desktop-Seitenwechsel geprüft. Galerie bei 320×740 und im Querformat 640×360
vollständig im Viewport; Bildwechsel per Button/Pfeiltaste und Fokusrestauration
geprüft. Tablet-Sponsorbereich 820×1180 mit geladenen Logos und passendem Anker,
Desktop 1536×960 geprüft. Keine erfassten Browserwarnungen/-fehler.
Screenshots: gallery-mobile-revision5.jpg und menu-mobile-revision5.jpg.
Finaler Vorschau-Build und gezieltes ESLint bestanden. TypeScript-Check mit
tsconfig.app.json weiterhin mit bereits bekannten Fehlern in printableCodeSheet,
appApi und bestehenden Tests; keine gemeldeten Fehler in src/preview.
Dies ist eine lokale Funktions-/Darstellungsprüfung, kein vollständiges
Produktions-, Screenreader- oder externes Link-Audit. Promocode/Konditionen und
öffentliche Interessenszählung bleiben die bereits bekannten offenen Inhalte.

## Teilbare Vorschau für René

Auf direkten Nutzerauftrag vom 06.10.2026 bereitgestellt:
https://kletterliga-saisonvorschau.vercel.app

Separates Vercel-Projekt `moonsight-media/kletterliga-saisonvorschau`.
Upload aus `tmp/season-preview/share-20261006`, ausschließlich statischer Build,
zehn verwendete WebP-Fotos, sieben Sponsorlogos und Heavitas. Keine Quellcodes,
App-/Admin-Endpunkte, Zertifikate, Backend-Zugänge oder sonstige Public-Dateien.
Robots Disallow, HTML noindex/nofollow und X-Robots-Tag gesetzt.
Die reguläre Kletterliga-Website wurde nicht verändert.
Vercel hat den ersten Deploy des neuen Projekts trotz `--target preview` als
Production dieses separaten Entwurfsprojekts angelegt; Hauptprojekt unberührt.
Demo-Ja bleibt ohne Speicherung/Zählung. Kein Versand an René erfolgt.

## Rabattcode – 07.10.2026
Auf ausdrückliche Angabe von Janosch: 5 % Community-Rabatt beim Kletterladen NRW mit Code KletterligaNRW. Platzhalter ersetzt; Schreibweise und mobile Lesbarkeit bei 320 Pixel geprüft. Anbieterbedingungen und Einlösbarkeit nicht unabhängig bestätigt. Vorschau-Build und gezieltes ESLint bestanden. Statischer Preview-Deploy aktualisiert; bestehender Vorschau-Alias zeigt auf den neuen Deploy. Hauptwebsite unverändert. Screenshot: kletterladen-code-20261007.png.

## Revision 7 – mehr Finalbilder und ruhigere Partnerdarstellung

Direktes Feedback von Janosch am 07.10.2026: mehr Bilder in Sechsergruppen, Hallenlogos und echte Bewertungszahlen, weniger eckiger Poster-Look bei Hallen und Sponsoren.

Designrichtung: vertraute Kletterliga-Farben und Überschriften, offene Listen, weiche Flächen und abgerundete Fotos. Bestehende Galerie/Lightbox als Bedienreferenz erhalten; keine neue Abhängigkeit. Hallen zweispaltig auf Desktop, einspaltig mobil. Partnerlogos mit Namen in offenen Zeilen, Hauptsponsor auf einer zusammenhängenden beigen Fläche; Code KletterligaNRW bleibt lesbar.

18 Fotos von Justus: zwölf direkt sichtbar, weitere sechs per Button. Neu eingeblendete Gruppe erscheint mit 550-ms-Einblendung und kurzem Versatz. Scroll- und Fokussprung zum ersten neuen Bild; reduzierte Bewegung schaltet Animation und weiches Scrollen aus. Alle Bilder weiterhin in Lightbox, mit Pfeiltasten und Escape bedienbar. NAS-Originale unverändert; 12 zusätzliche WebP-Dateien exportiert.

Hallenstatistik: 1.336 Routenbewertungen aus der Qualifikation 01.05.–13.09.2026. Mittelwert aller einzelnen Bewertungen 1–5 je Halle, aktive Routen und nicht archivierte Teilnehmerprofile. Berlin-Zeitraum in UTC gefiltert. Anzeige: Durchschnitt von fünf Sternen und Bewertungsanzahl. Statischer aggregierter Snapshot ohne Personen-IDs oder einzelne Bewertungen: src/preview/data/gym-stats-2026.json. 20 aktive Routen pro Halle bestätigt. Keine Änderung am Backend oder Zugriffssystem.

QA mit Design Better Interfaces und Verify Web Products: Desktop 1366×900, Tablet 820×1180, schmale Mobile 320×740. Keine Seitenüberbreite bei 320/820, acht Hallenlogos und sechs weitere Sponsorenlogos geladen, Rabattcode bei 320 ohne inneren Überlauf. Galerie auf Start und Saisonseite geprüft: zwölf → 18 Fotos, Fokus auf Bild 13, Lightbox 13 → 14 per Pfeiltaste, Escape zurück auf Bild 13. Keine erfassten Browserwarnungen oder Fehler. Bestätigtes kleines Darstellungsproblem des weißen 2T-Logos mit dunkelblauer Logofläche korrigiert. Gezieltes ESLint und endgültiger Vorschau-Build bestanden. Keine vollständige Produktions-, Screenreader- oder Anbieterprüfung.

Statischer Preview-Deploy auf separatem Projekt kletterliga-saisonvorschau, mit ausschließlich Build-Assets, 22 verwendeten WebP-Bildern, acht Hallenlogos, sieben Sponsorlogos und Schrift. Kein Quellcode, Zugang oder Admin-Export hochgeladen. Hauptwebsite unverändert. Notion-Feedbacksammlung um den Nutzerwunsch und dessen Umsetzung ergänzt.
Screenshots: sponsors-soft-20261007.png, halls-ratings-20261007.png, gallery-expanded-20261007.png.

## Revision 8 – seitliche Galerie und kantige Markenform
Rundungen der Revision 7 zurückgenommen. Hallen ohne Sterne oder prominente Bewertungsanzahl: Euer Routenschnitt X von 5 und 20 Liga-Routen. Galerie als eine horizontale Reihe von 18 Fotos mit Vor-/Zurück-Pfeilen; Desktop sechs sichtbar, Tablet drei, Mobile zwei. Keine zusätzlichen Fotogruppen untereinander. Native horizontale Scroll-/Touchbedienung und Scroll-Snap, kein Autoplay. Pfeiltasten wechseln zur nächsten sichtbaren Gruppe und setzen den Fokus auf deren erstes Bild. Reduzierte Bewegung ohne weiches Scrollen. Hauptsponsor ruhig, kantig und mit schrägem Markenbutton; Partnerlogos als offene Listen. Gezieltes ESLint und Build bestanden. Browser 1366x900, 820x1180 und 320x740 geprüft; sechs Fotos liegen auf derselben Y-Position, Radius 0px. Desktop Bereiche 1–6, 7–12, 13–18 geprüft, letzte Weiter-Taste deaktiviert, zurück möglich; Mobile seitliches Blättern, Lightbox Enter/Escape und Fokusrestauration geprüft. Kein horizontaler Seitenüberlauf. Screenshot gallery-horizontal-20261007.png. Notion-Feedback aktualisiert und öffentlicher Vorschau-Alias neu zugeordnet. Produktionswebsite unverändert.

## Revision 9 – Bewertungsanzahlen wieder anzeigen
Auf direkte Nutzerkorrektur vom 07.10.2026 die identische Routenanzahl durch die tatsächliche Anzahl abgegebener Routenbewertungen je Halle ersetzt. Routenschnitt ohne Sterne bleibt. Verifizierter Aggregat-Snapshot unverändert. ESLint und Vorschau-Build bestanden; bei 320 Pixel kein horizontaler Seitenüberlauf, Desktop-Anzeige geprüft. Vorschau-Alias aktualisiert. Screenshot halls-rating-counts-20261007.png.

## Revision 10 · 07.10.2026 · Moonsight-Footer
Auf direkten Wunsch von Janosch im gemeinsamen Footer „Website von Moonsight Media“ mit https://moonsight.media verlinkt. URL entspricht dem bestehenden Impressum und dem Moonsight-Projektbrief. Neuer Tab mit noopener/noreferrer; sichtbarer Tastaturfokus und mindestens 44 px Klickhöhe. Desktop rechts, mobil unter dem Copyright.
Verifikation: ESLint für Footer und Vite-Build bestanden. Lokale Browserprüfung bei 320 px ohne horizontalen Überlauf, Desktop geprüft. Screenshot: docs/screenshots/season-preview/footer-moonsight-desktop.png.
Kuratiertes statisches Bundle: tmp/season-preview/share-20261007-footer. Deployment: https://kletterliga-saisonvorschau-fl74xh6te-moonsight-media.vercel.app. Bestehender Vorschau-Alias erfolgreich aktualisiert: https://kletterliga-saisonvorschau.vercel.app. Feedback in vorhandener Notion-Sammlung ergänzt. Produktionsseite unverändert.
`nRevision 11 · 07.10.2026: Footer auf direkten Wunsch zu „Supported by Moonsight Media“ geändert, Link beibehalten. Vite-Build und lokale Browserprüfung bestanden. Vorschau-Alias auf Deployment 8z3ory3cl aktualisiert.
## Produktionsfreigabe · 07.10.2026

Janosch hat Archivierung und Umschaltung der Hauptwebsite ausdrücklich freigegeben.

- Sicherung: GitHub-Tag `archive/website-before-season-recap-2026-10-07` auf `fc64b5db8e9804ade6ecec652e8b74d3c32128cc`. Git-Bundle mit vollständiger Historie unter `tmp/season-preview/backup/website-before-season-recap-2026-10-07.bundle`, verifiziert.
- Bisheriger erfolgreicher Canonical-Deploy: GitHub Deployment `6887764285`, `https://kletterliga-nrw-webseite-9enih0g86-kletterliga-nrws-projects.vercel.app`.
- Release über GitHub main, dessen Vercel-Integration im Team `kletterliga-nrws-projects` liegt. CLI-Team `moonsight-media` ist ein anderes Projekt; keine Domain-/DNS-Änderungen.
- Aktuellen main-Stand einschließlich privatem Feedback-Dashboard übernommen. Teilnehmer-App, Admin, Mailbestätigungslinks, Finalhandouts, Kontakt und Rechtstexte bleiben erreichbar.
- Hauptwebsite zeigt Saisonrückblick, 2026-Seite, öffentliche Ergebnisse und 2027-Ausblick. Alte Navigationslinks werden passend weitergeleitet. Entwurfslabels nur in separater Vorschau. Neue Seitentitel, Canonicals, indexierbare HTML-Fallbacks und Sitemap.
- Ja-Button speichert echte unverbindliche Antworten über neue Supabase Edge Function `season-interest-2027`. Migration `20261007110000` bereits gezielt angewendet und registriert. Random UUID + Zeitstempel, keine Namen/Mails/IPs in der Tabelle. Wiederholungen derselben UUID werden ignoriert. Lokaler Browserspeicher wird erst durch bewussten Klick gesetzt. Fehler bestätigen kein erfolgreiches Ja. Pro Browser, keine Personenzählung; verschiedene Geräte/gelöschter Speicher können mehrfach zählen. Einfache flüchtige Rate-Limitierung, kein vollständiger Bot-Schutz.
- Interessenszahl als geschützte Anzeige im Liga-Admin-Dashboard, RPC `admin_season_interest_2027_count`; Details bleiben für öffentliche und Teilnehmerrollen gesperrt. Nach Planung 2027 Liste löschen.
- QA: Produktions-Build, ESLint, 16 relevante Tests bestanden. Backend zweimal dieselbe Testkennung geschickt → genau ein Datensatz. Browser-Ja und Reload bestätigt. Beide eigenen Testdatensätze gezielt gelöscht, danach 0 Antworten. Kein Zugriff auf Interessensdaten durch anon/authenticated. Mobile 375 px ohne Überlauf oder kaputte Bilder; mobile Navigation, öffentlicher Phasenwechsel, Impressum und App-Login lokal geprüft. Separater vollständiger TypeScript-Check meldet bestehende Fehler in unveränderten printableCodeSheet/appApi/mastercode-Tests; keine Meldung in geänderten Dateien.

### Rückkehr zum alten Stand

Die Releaseänderung in Git rückgängig machen und über denselben GitHub-main-Releaseweg veröffentlichen; der Tag bezeichnet den vollständigen alten Stand. Bei direktem Zugriff auf das Canonical-Vercel-Team alternativ das oben genannte vorherige Production-Deployment zurückrollen. CLI und Connector dieses Geräts haben aktuell keinen direkten Zugriff auf dieses Team. Die neue Interessentabelle muss für einen Website-Rollback nicht entfernt werden; vorhandene Antworten erhalten.
