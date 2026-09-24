# Schiedsrichteransicht – Arbeitsoberfläche am Routentag

## Richtung

Ein ruhiges, kontrastreiches Zeitnahme-Instrument im Kletterliga-Design: Die betreute Route, verbleibende Zeit und nächste Handlung sind auf einen Blick erkennbar, auch unter Zeitdruck auf einem Handy.

## Referenzen und Synthese

- Flow-Referenz: bestehender Kletterliga-Wettkampfablauf (Route wählen → Uhr starten → letzte Minute ansagen → bei fünf Minuten ablassen → QR-Code zeigen). Übernommen wird die Reihenfolge, nicht eine generische Dashboard-Navigation.
- Stil-Referenz: `docs/stitch_design.md` und `src/app/stitch-theme.css`. Navy und Creme tragen die Oberfläche; Terrakotta markiert Warnungen und aktive Aktionen. Space Grotesk für Zeit/Route, Manrope für Anweisungen. Kein neues visuelles System.
- Verworfen: 14 Routen als primärer Bildschirm, versteckte Uhrzustände im QR-Tab, dekorative Bewegung und Alarmversprechen bei gesperrtem Bildschirm.

## System und Verhalten

- Primär: maximal zwei typische Stationsuhren direkt sichtbar, weitere Routen bewusst auswählbar. Auswahl bleibt auf diesem Gerät gespeichert; laufende Uhren dürfen nicht ausgeblendet werden.
- Je Route: Nummer und Name, eindeutiger Status, große verbleibende Zeit, Fortschrittsbalken, eine dominante Start/Pause/Fortsetzen-Aktion, sekundär QR und geschütztes Zurücksetzen.
- Letzte Minute und Ablauf: Farbe **plus Text** und eine dauerhaft sichtbare Statusleiste. Der Ton ist optional und ergänzt die visuelle Anzeige nur.
- QR: direkt von jeder Routenuhr erreichbar; in der QR-Übersicht steht der ausgewählte Code auf Mobilgeräten vor der langen Routenauswahl. Druck ist eine nachgeordnete Aktion.
- Zugriff: Code nur im Arbeitsspeicher, kein App-Konto; bei Verbindungsproblemen laufen lokale Uhren weiter, QR-Freigabe wird erneut geprüft.

## Responsive und Barrierefreiheit

- 320–430 px: vertikale, kompakte Uhren und große Touch-Ziele; Statusleiste bleibt sichtbar; QR öffnet als fokussierter Dialog.
- Tablet: zwei Spalten für Uhren, QR und Auswahl je nach Platz.
- Desktop: breite, aber begrenzte Arbeitsfläche mit zwei Uhren nebeneinander.
- Fokuszustände mit Markenfarbe, kein Layoutsprung. Zustände nicht allein farblich. Dialog und Tabs per Tastatur bedienbar. Reduzierte Bewegung ohne Puls-/Übergangsanimation.

## Grenzen

- Die Uhren sind lokale Hilfsmittel, nicht die offizielle Ergebniszeit. Browser-/Betriebssystem-Alarme im Hintergrund sind nicht garantiert; der Bildschirm muss während der Zeitnahme sichtbar bleiben.
- Kein Umbau der Ergebnisabgabe oder des Schiedsrichter-Zugangs-RPC.
