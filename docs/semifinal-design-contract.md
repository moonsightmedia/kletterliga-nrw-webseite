# Halbfinal-Startseite · Designrichtung 15.09.2026

## Bestätigung vor Anmeldung · Ergänzung 15.09.2026

Ziel: eine kurze, ruhige Zusammenfassung im vertrauten App-Design vor der
verbindlichen Zusage. Erster Klick öffnet nur den Dialog; erst „Jetzt verbindlich
anmelden“ ruft die bestehende Registrierung auf. Keine zusätzliche Checkbox,
keine Änderung an Teilnahmebedingungen, Fristen, Gebühren oder Berechtigungen.

Vorhandenes Radix-AlertDialog-Primitive mit Navy/Creme, Terrakotta-CTA und
Stitch-Typografie verwenden. Datum und freigegebene Klasse aus dem geladenen
Serverstatus, Ort aus der bestehenden Eventseite. Kurz erläutern: Halbfinalstart
ist kein garantierter Finalplatz; Check-in-/Startzeiten noch offen; Abmeldung
innerhalb der angezeigten Frist bei geöffneter Anmeldung, danach Orga kontaktieren.

320px: volle mobile Dialogbreite mit Seitenabstand, stapelbare Buttons und
scrollbarer Inhalt. Ab 480px Aktionen nebeneinander, maximal 32rem breit.
Fokus startet auf Zurück, bleibt im Dialog und kehrt beim Abbruch zum Auslöser
bzw. nach Erfolg zum bestätigten Status zurück. Fehler im Dialog sichtbar;
Doppelklick und ungültiger/geschlossener Status dürfen keine Zusage auslösen.

Lokal verifiziert: 205 Unit-/Komponententests (davon sieben neue Dialogtests),
60 Browser-Prüfungen ohne Fehler, Produktionsbuild und gezieltes ESLint.
Dialog bei 320×640, 390×844, 768×1024, 1440×1000 und 844×390 geprüft;
Öffnen/Abbrechen ohne Schreibzugriff, Tastaturfokus, Fehler/Wiederholen und
Statusänderungen während der Bestätigung abgedeckt.

Die Saison geht sichtbar zu Ende, während sich das vertraute dunkle Dashboard
in den direkten Einstieg zur Halbfinalanmeldung verwandelt.

## Referenzen und Synthese

- Stil: bestehendes Home.tsx und stitch_design.md. Dunkles Navy als durchgängige
  Fläche, Creme als Schrift, Terrakotta für die Hauptaktion, kräftige kompakte
  Großbuchstaben und getönte Karten statt heller Website-Karten.
- Ablauf: bisherige Saison-Timeline aus Home.tsx. Die tatsächlich konfigurierten
  Qualifikationsetappen werden einmalig gefüllt und abgehakt. Gemeint ist der
  Zeitablauf der Qualifikation, nicht die persönliche Halbfinalberechtigung.
- Übernehmen: bestehende Navigation, Stitch-Tokens, Schriften, 12px-Radien.
  Anpassen: ein klarer Anmeldebereich direkt nach kompaktem Kopf/Etappenabschluss.
  Verwerfen: großer heller Seitenhintergrund, ausladender Marketing-Hero und
  wiederholte Intro-Animation bei jedem Navigationsschritt.

## Bewegung und Zustände

- Erstes Öffnen nach Qualifikationsende: ca. 2,6 Sekunden. Die Etappenlinie
  füllt sich; Monats-/Etappenknoten schließen ab; Abschluss zeigt 100 Prozent
  des Qualifikationszeitraums. Anschließend öffnet sich die Halbfinal-Startseite.
- „Direkt zum Halbfinale“ überspringt jederzeit. Einmal pro Profil/Saison und
  Qualifikationsende merken; Speicherausfall darf Navigation nicht blockieren.
- Bei prefers-reduced-motion sofort die Halbfinalseite, ohne Intro-Wartezeit.
  Kleine statische Etappenübersicht bleibt danach als Kontext sichtbar.
- Keine zusätzlichen Bibliotheken, kein Canvas, keine generierten Medien.
- Registrierung, Freigabe, Lade-/Fehler-/Frist-/Absagezustände bleiben echte
  Serverzustände; Animation verändert weder Berechtigung noch Saisonwerte.

## Responsive und Accessibility

- 320/390: einspaltig, Hauptaktion vor ergänzenden Infos, gesamte Etappenleiste
  ohne horizontales Scrollen; kompakte Schriften und min-w-0.
- 768: kompaktes Dashboard; erst ab genügend Breite Registrierung und Infos
  nebeneinander. 1440: begrenzte Inhaltsbreite, kein breiter Website-Hero.
- Kontrastreiche Texte, 44px-Aktionen, sichtbarer Tastaturfokus, keine verdeckte
  Anmeldung unter dem Dock. Autoübergang stiehlt keinen Fokus außerhalb des
  Intros. Ranglisten und Eintragungen bleiben jederzeit erreichbar.

## Abnahme

Intro-Mitte/Ende, Überspringen, zweite Öffnung, Profilwechsel, reduzierte Bewegung,
Anmeldung/Absage/Fehler und 320/390/768/1440 im isolierten Browser prüfen. Live-
Backend bleibt unverändert; keine produktive Freigabe Teil dieser Gestaltung.
