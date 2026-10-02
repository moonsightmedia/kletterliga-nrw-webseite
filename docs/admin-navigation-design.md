# Adminnavigation und Wettkampftag

## Designrichtung

Eine ruhige Arbeitsoberfläche mit kurzen Wegen: Aufgabe wählen, Daten prüfen, gezielt speichern. Die bekannte Kletterliga-Marke bleibt erhalten. Weiße Arbeitsflächen, warmer Hintergrund, dunkle Schrift und sparsame braune Akzente ersetzen die lange, gleichgewichtige Navigation.

## Referenzen und Synthese

Die vorhandene Halbfinalrangliste ist die Referenz für kompakte tägliche Arbeit. Die mobile Finaleingabe ist die Referenz für fokussierte Schritte. Stilreferenz ist das bestehende Kletterliga-Design. Übernommen werden Farben, erprobte Formulare und Wertungsfunktionen; angepasst werden Hierarchie und Navigation. Verworfen werden doppelte Ergebnislisten, Daueranleitungen, große Statuskarten und Urkunden in der Vorbereitung. Grundlage ist Janoschs direkter Auftrag vom 02.10.2026.

## Informationsarchitektur

Globale Liga-Administration: Übersicht, Wettkampftag, Teilnehmer, Saison & Wertung, Hallen, Verwaltung. Jeweils nur die Unterpunkte des geöffneten Bereichs zeigen; der aktuelle Bereich öffnet sich beim direkten Seitenaufruf. Alle 15 bestehenden Ziele bleiben erhalten. Hallen-Admins erhalten vier entsprechend gebündelte Bereiche ohne Liga-Adminziele. Berechtigungen und Routenwachen bleiben unverändert.

Wettkampftag: Übersicht; Einrichtung mit Halbfinalrouten, Finalrouten und Zugänge/Eingabe; Halbfinale mit Rangliste und Teilnehmerdialog; Finale mit Startlisten und Ergebniskontrolle; TV & Hinweise; Abschluss mit Urkunden. Einstellungen zum Finalpasswort stehen bei den Zugängen. Finalrouten werden unabhängig von Klassen angelegt; die Zuordnung bleibt bei der jeweiligen Finalstartliste. Einrichtung heute, Zuordnung morgen nach dem Halbfinale.

Jede Ansicht hat eine eigene URL über bereich und einrichtung. Zurück/Vorwärts im Browser stellt die Ansicht wieder her. Bereits geöffnete Einrichtung und TV-Einstellungen bleiben montiert, damit Entwürfe bei internem Ansichtswechsel erhalten bleiben. Bestehende Speichern-, Begründungs- und Bestätigungsregeln bleiben erhalten.

## Komponenten und Responsive

Desktop: 240px Seitenleiste, ruhiger Breadcrumb und flexible Arbeitsfläche. Tablet: dieselben sechs Bereiche, Umbruch der Wettkampfnavigation ohne Seitenüberlauf. Handy: Menü als Dialog mit Fokusführung und Escape; Wettkampfabschnitte in einem 3×2-Raster, Einrichtungsauswahl darf umbrechen. Touch-Ziele mindestens44px. Tabellen und fokussierte Teilnehmerdialoge bleiben erhalten.

Typografie: normale, gut lesbare Arbeitsüberschriften; keine zusätzlichen Großbuchstaben für Routeneinstellungen. Spacing8/12/16/24/32, Radien8/12, dezente Konturen. Status zusätzlich als Text, Fehler und Erfolg separat. Sichtbarer Fokus, semantische Tabs und beschriftete Navigationen. Keine neue Animation außer bestehender Dialogbewegung; reduzierte Bewegung berücksichtigen. Keine neuen Bibliotheken.

## Urkunden

Die vorhandene Urkundenfunktion verwendet Halbfinalpunkte. Deshalb ist ihre Wertungsquelle ausdrücklich beschriftet; sie steht im Abschluss. Keine Änderung der sportlichen Wertung oder Datenbankmigration in dieser Umstrukturierung. Eine Umstellung auf endgültige Finalplatzierungen braucht eine eigene fachliche Festlegung.

## Prüfumfang

Rollengetrennte Navigation und alle bestehenden Ziele; direkter URL-Aufruf und Browserhistorie; Finalrouten ohne Klassen anlegen; Entwürfe bei Wechsel bewahren; Halbfinalroute/Klassenzuordnung speichern; Zugang, Rangliste, Finalstartliste, Papierabgleich und TV erreichbar. Browserprüfung bei390/768/1440px, mobile Fokusführung und Produktionsbuild. Die Demo bleibt ausschließlich Entwicklungsmodus und arbeitet mit erfundenen lokalen Daten.
