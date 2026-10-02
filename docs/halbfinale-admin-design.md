# Halbfinalverwaltung · Bedienkonzept 01.10.2026

Die Halbfinalverwaltung ist eine ruhige Arbeitsliste: Teilnehmer finden, Route öffnen, Wert mit Begründung speichern.

## Oberfläche

- Eine kompakte Kopfzeile und normale Navigation, keine nummerierte Schrittfolge.
- Die Rangliste ist die Hauptansicht. Klassenwahl, Suche und Filter für offene Ergebnisse stehen direkt darüber.
- Ein Teilnehmer öffnet einen Dialog mit seinen fünf Routen. Vorhandene Werte heißen **Ändern**, fehlende **Eintragen**.
- Nur die ausgewählte Route erhält Griffwahl, Begründung und Speichern/Abbrechen. Erstabgabe und Korrektur bleiben nachvollziehbar.
- Einstellungen und Protokolle sind standardmäßig geschlossen. Die Demo kennzeichnet erfundene Daten in einer Zeile; Testwerkzeuge stehen unter **Demo-Optionen**.
- Keine erklärenden Textkarten, doppelte Klassenüberschriften, Kennzahlenkarten oder globale Liste aller Eingabezeiten in der Halbfinalansicht.

## Gestaltung

Die bestehende Kletterliga-Marke bleibt erhalten: dunkles Blau für Text, warme helle Flächen, brauner Akzent für Aktionen. Kompakte Tabellenzeilen, sparsame Konturen und normale lesbare Schrift ersetzen die großen Karten. Desktop und Tablet nutzen die verfügbare Breite; auf dem Handy bleiben Name, Punkte, offene Ergebnisse und Route erreichbar. Bestehende zugängliche Dialog-, Select- und Tabs-Komponenten, sichtbarer Tastaturfokus und ausreichend große Trefferflächen bleiben erhalten.

Referenzen sind die vorhandene Rangliste und die tatsächlichen Aufgaben am Wettkampftag. Übernommen werden Markenfarben und bekannte Routendarstellung; vereinfacht werden Navigation und Hierarchie. Verworfen werden die mehrfachen Anleitungen vor der Rangliste und die Trennung zwischen Ranglisten-Leseansicht und einem weit entfernten Nachtragsformular. Grundlage ist Janoschs ausdrücklicher Wunsch nach minimaler, intuitiver Bedienung.

## Regeln

Null ist ein eingetragenes Ergebnis; fehlend bleibt offen. René kann während der offenen Eingabe und nach dem Abschluss begründet nachtragen oder korrigieren. Ein einzelner Nachtrag schließt nicht das ganze Halbfinale. Die normale Teilnehmerabgabe endet weiter automatisch am 03.10.2026 um 16:00 Uhr. Der Vorbereitungszustand erlaubt keine Nachträge. Rechte und Änderungsprotokoll bleiben serverseitig geprüft.

Die neue additive Migration `20261002100400_semifinal_admin_workflow.sql` erlaubt Admin-Nachträge und Klärungen auch im offenen Halbfinale und ergänzt die abgesicherte Korrektur. Migration und SQL-Test wurden am 02.10.2026 auf einer isolierten PostgreSQL-Datenbank mit echtem Schema geprüft. Alle fünf Wettkampfmigrationen sind produktiv eingespielt. Renés Liga-Admin-Berechtigung und der Zugriff auf die echten Dashboarddaten sind serverseitig geprüft; sein persönlicher Login bleibt vor Ort zu testen.

Korrekturen aus dem Teilnehmerdialog verwenden eine neue transaktional geprüfte RPC. Der Editor übermittelt den beobachteten Wert und den Zeitpunkt der letzten Änderung. Der Server sperrt das Ergebnis und prüft diesen Stand vor dem Schreiben; veraltete Korrekturen werden abgewiesen. Die bisherige Korrektur-RPC anderer Verwaltungsansichten bleibt erhalten.
