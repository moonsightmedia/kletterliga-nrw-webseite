# Finaltag-Verwaltung · 02.10.2026

René findet eine Klasse oder Person schnell, führt eine eindeutige Aktion aus und sieht den gespeicherten Stand ohne überladene Arbeitsfläche.

## Richtung

Die freigegebene Halbfinalverwaltung und mobile Finaleingabe sind Ablauf- und Stilreferenzen. Übernommen werden normale Schrift, kurze Labels, Navy/Creme/Terracotta, ruhige Konturen, 12-px-Radien, große Tippflächen und fokussierte Dialoge. Angepasst werden Listen für Tablet-Verwaltung und die größere, entfernte TV-Anzeige. Entfallen sind Werbeüberschriften, nummerierte Navigationskarten, globale Begründungsfelder, doppelte Teilnehmerlisten und technische Kürzel.

## Arbeitsablauf

- Übersicht: Klassenstatus und nächste Aktion, offene Halbfinaleinträge und Papierprüfungen, eingeklappter Verlauf.
- Startlisten: Vorschlag und Route vor Freigabe; danach bestätigte Reihenfolge und Druck. Halbfinalfeld und Nachrücker bleiben aufklappbar. Ausfall wird bei einer Person begründet dokumentiert. Nachrücken bleibt bis zum Klassenstart möglich.
- Finale: kompakte Ergebnisliste; Person öffnet Details, Papierabgleich und Ausfallstatus. Abschluss und Wiederöffnung erfolgen in einem Klassendialog. Veraltete Dialogstände werden nicht als aktuelle Version gespeichert.
- TV: Halbfinale/Finale, ausgewählte Klassen, automatische Rotation oder feste Klasse, Intervall. Bearbeitete Einstellungen werden durch Polling und Aktualisieren nicht überschrieben; Speichern und Zurücksetzen sind eindeutig.
- Hinweise: aktuelle Hinweise zuerst, neue oder bearbeitete Hinweise in einem Dialog, Ablauf standardmäßig zehn Minuten. Bildschirmfüllend nur bei TV-Ziel. Abgelaufene Hinweise bleiben getrennt einsehbar.
- Teilnehmer: kurze Rangliste, verständlicher Status, Wertungsregeln aufklappbar. TV behält öffentliche URL, Rotation, Ablauf und letzten Stand bei Verbindungsfehlern.

## Grenzen und Prüfung

Bestehende RPCs, Berechtigungen, Rangberechnung und Datenmodell bleiben erhalten. Keine neue Bibliothek. Lokale Demo und simulierte UI-Tests prüfen Bedienung; echte Datenbankrechte, Migrationen und physische Geräte bleiben Teil der ausstehenden isolierten Datenbankprobe und Generalprobe.

Geprüft am 02.10.2026: 72 Tests in 13 Dateien, gezielter ESLint und Produktionsbuild bestanden. Der App-Typecheck zeigt weiterhin 15 bekannte Fehler außerhalb der Änderungen. Neun neue Verwaltungsprüfungen decken Freigabegrenze, fehlende Routen, veraltete Dialogstände, Ausfälle, Abschluss, TV-Entwürfe, Hinweisablauf und Exporte ab. Browserprobe bei 390/768/1440 px sowie TV bei 1920 × 1080; keine Fehler in der Browserkonsole. Sieben Starter freigegeben, umgeordnet und als neue Version gedruckt; zwei vollständige A4-Seiten mit langen Namen und Schreibfeldern geprüft. Papierabgleich, begründeter Nichtstart, Abschluss/Wiederöffnung, Hinweisrücknahme und anschließende Klassenrotation funktionieren mit synthetischen Daten. Neun aktuelle Bilder stehen in der [Kurzanleitung](kurzanleitung-finaltag-mit-screenshots.md).
