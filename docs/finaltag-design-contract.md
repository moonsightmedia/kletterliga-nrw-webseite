# Finaltag: Bedien- und Darstellungskonzept

Stand 02.10.2026. Gilt für die tatsächliche Wettkampfzentrale, Finalstation, Teilnehmer-Rangliste und öffentliche TV-Seite. Die Entwicklungsdemo bindet dieselben React-Komponenten mit ausschließlich erfundenen Browserdaten ein.

## Zweck und Führung

René entscheidet je Klasse, was als Nächstes passiert. Die Übersicht zeigt Klassenstatus und nächste Aktion; die Klassenzeile öffnet direkt die passende Ansicht. Bearbeitungsansichten zeigen immer die aktuelle Klasse und einen beschrifteten Klassenwechsel. Die fünf Ansichten bleiben erreichbar; laufende Klassen dürfen unabhängig voneinander fortschreiten.

1. Halbfinalranglisten live verfolgen und Namen für Routendetails aufklappen. QR-bestätigte und abgesendete Ergebnisse zählen ohne zweite Freigabe. Um 16 Uhr am Wettkampftag sperrt die normale Abgabe automatisch; René klärt fehlende Werte anschließend mit Begründung. Nullwerte bleiben von fehlenden Einträgen unterscheidbar.
2. Finalfeld mit Punktgleichen, physische Route bestätigen. Beide Final-Handys sehen alle freigegebenen Klassen.
3. Startliste prüfen, gegebenenfalls umordnen und im separaten Drucktab ausgeben.
4. Klasse starten; die Zeitnahme erfasst manuell und bestätigt die Zusammenfassung.
5. Eingabe schließen, Papierabgleich vollständig durchführen, offiziell freigeben.

Routenpflege, Finalpasswort und Halbfinal-Grundkonfiguration sind aufklappbar. Sie sind bei fehlender Vorbereitung geöffnet. Alltägliche Ergebnisse und Entscheidungen werden dadurch nicht von Einrichtungsschritten verdrängt. Fehlende Gründe, fehlende Ergebnisse und bereits gestartete Personen deaktivieren die betroffenen Aktionen. Die Datenbank prüft erneut innerhalb der Transaktion.

## Design

Bestehende Stitch-Komponenten, Space Grotesk/Manrope und Kletterliga-Farben: Navy #003d55/#002637, Creme #f2dcab, Terracotta #a15523. Kompakter heller Kopf, kurze unnummerierte Navigation, ruhige Listen, normale Schrift, kräftige primäre Aktion und 12-px-Radien. Bestehende Radix-Auswahlmenüs mit expliziten zugänglichen Namen. Touchziele mindestens 40–48 px. Keine neue Bibliothek.

Auf kleinen Bildschirmen fließen Navigation und Steuerung um. Ranglisten sind als Namenszeilen gestaltet, sodass Name, Ergebnis und Status ohne seitliches Scrollen lesbar sind. Ausführliche Admin-Ergebnistabellen dürfen innerhalb ihres Containers seitlich scrollen; die Seite selbst läuft nicht über.

## TV-Verhalten

`/live/2026` liegt außerhalb der Anmelde- und Rollenprüfung und enthält keine Verwaltungs- oder Zurück-Buttons. Die öffentliche RPC liefert ausschließlich veröffentlichbare Ergebnisse und Hinweise. Ein Halbfinale in `draft` liefert keine Teilnehmernamen. René konfiguriert den Bildschirm mit seinem eigenen Konto in der Zentrale.

Eine einzige Rotation läuft über die gewählten Klassen und ihre Seiten: zunächst alle Seiten der ersten Klasse, danach die nächste Klasse; acht Personen je Seite. Standard 15 Sekunden je Seite, einstellbar 5–120 Sekunden. Eine fixierte Klasse wird weiterhin seitenweise angezeigt. Fünfsekündige Datenabfragen setzen den Rotationstimer nicht zurück. Bei Verbindungsfehlern bleibt der letzte Stand mit Warnung sichtbar.

Ein Vollbildhinweis pausiert die Rotation. Nach Rücknahme oder Ablauf setzt sie automatisch fort. Das Ablaufdatum wird zusätzlich im Browser geprüft, damit ein bereits geladener Hinweis auch bei Netzausfall verschwindet. App-Hinweise verhalten sich genauso. Ohne Ablauf bleibt ein Hinweis bis zur Rücknahme; die Oberfläche bietet diese Wahl ausdrücklich an.

## Rangliste

Die Teilnehmerseite trennt Halbfinale und Finale in zwei Ansichten und filtert nach Klasse. Sobald bestätigte Finaldaten vorhanden sind, öffnet sie das Finale; eine manuelle Auswahl wird respektiert. Ergebnisrang und Startposition sind verschieden. Offene Ergebnisse/DNS haben keinen regulären Rang. Papierprüfung und endgültige Freigabe bestimmen die sichtbare Kennzeichnung. Ein fehlgeschlagener Abruf löscht den letzten gültigen Stand nicht.

## Abnahme und Grenzen

- Automatisierte Prüfungen: tatsächliche Routen schützen Admin und lassen TV ohne Login zu; Rotation trotz Polling, mehrseitige Klasse, Vollbildablauf bei Offline-Zustand, Datenhaltung bei Abrufausfall, Finalstandardansicht, Statusanzeige.
- Browser-Probe mit synthetischen Daten: U18 starten, Station anmelden, Nora Muster mit Griff 24 und 3:12 erfassen, Speicherung bestätigen, identischen Wert in Teilnehmeransicht sehen. Offene Toprope-Route klären und Startliste bestätigen.
- Darstellung: Handy 390 px, Tablet 768 px, Verwaltung 1440 px, TV 1920 × 1080. Screenshots in `docs/screenshots/` dokumentieren den beobachteten Stand.
- Gesamttests: 70 Dateien, 307 Tests bestanden; nach den letzten Druck- und Rücksetzkorrekturen die 14 betroffenen Oberflächentests erneut bestanden. Gezielter ESLint-Lauf und Produktionsbuild bestanden. Die 15 bereits bestehenden TypeScript-Fehler außerhalb dieser Änderung bleiben bestehen.
- Nach der Halbfinalkonkretisierung: 46 gezielte Tests in acht Dateien bestanden, einschließlich des Fristwechsels bei bereits offener Teilnehmer-Eingabe, QR-Abgabe, Nullwerten, Ranglisten und TV. Erneuter ESLint-Lauf ohne Fehler (drei bestehende Fast-Refresh-Warnungen) und Produktionsbuild bestanden. Der App-Typecheck zeigt weiterhin dieselben 15 bestehenden Fehler. Lokale Browserprobe: 16-Uhr-Sperre simulieren, Robins fehlende Route begründet nachtragen und identische 280 Punkte in Admin- und Teilnehmeransicht; TV zeigt automatisch wechselnde Halbfinalklassen und Seiten ohne Login.
- Browserdruck: zwei freigegebene Klassen mit jeweils sieben Startern ergeben zwei nicht leere A4-Seiten. Lange Namen, Schreibfelder und Unterschriftsfelder wurden in der gerenderten PDF geprüft. Eine leere erste Seite wurde behoben.
- Lokal fehlen Supabase-Umgebungsvariablen und ein funktionierender isolierter Datenbankzugang. SQL-Rechte-/Transaktionstests und Renés tatsächliches Konto bleiben offen. Browserdaten sind kein Nachweis produktiver Datenbankrechte. Vor Produktivfreigabe Migrationen und SQL-Test in isolierter Umgebung ausführen, danach zwei Stationsgeräte, TV und echte Ausdrucke prüfen.

## Gemeinsames Finalpasswort · Entscheidung 01.10.2026

Janosch bestätigt ein gemeinsames Passwort für beide Final-Handys. René richtet es in Finale ein; beide Handys wählen alle freigegebenen Klassen. Handy 1/2 kennzeichnet nur die Eingabequelle. Passwortwechsel widerruft das alte für beide, auch bei wiederholten Speicheranfragen. Keine Erweiterung der Halbfinal- oder Adminrechte; TV bleibt ohne Anmeldung. Der Link zur Finaleingabe erscheint nicht im Halbfinaldemo.

## Vereinfachte Halbfinalverwaltung · 01.10.2026

Die Halbfinalansicht verwendet eine kompakte Kopfzeile und Navigation, Suche über alle Klassen, Klassenfilter und offene Ergebnisse. Teilnehmer öffnen einen fokussierten Routendialog mit Ändern oder Eintragen. Texte, doppelte Klassenkarten und globale Eingabezeitlisten entfallen. Konfiguration und Protokolle sind zugeklappt. Der neue Bedienablauf und die zugrunde liegenden Regeln stehen in [Halbfinalverwaltung](halbfinale-admin-design.md).

## Finaleingabe auf dem Handy · 01.10.2026

Die digitale Zeitnahme verwendet getrennte Klassen-, Teilnehmer-, Eingabe- und Prüfungsansichten. Große Tippzeilen ersetzen Dropdowns; Ergebnis und gestoppte Zeit werden über Griff/TOP und Zahlenfelder erfasst. Name, Route und Startposition bleiben sichtbar. Speichern führt zurück zur gleichen Klasse; bestehende Werte öffnen eine begründete Korrektur. Lokale Entwürfe bleiben beim Zurückgehen, Netzausfall und Versionskonflikt erhalten. Bestätigte Speicherung wird vom folgenden Listenabruf getrennt. Details: [Mobile Finaleingabe](finaleingabe-mobile-design.md).

## Verwaltungsprüfung 02.10.2026

72 gezielte Tests in 13 Dateien bestanden; neun neue Ablaufprüfungen für Startfeld, veraltete Papierdialoge, Ausfallbegründung, Klassenfreigabe, TV-Entwürfe, Hinweisablauf und Ergebnisexport. Browser: Startfeld mit sieben Personen freigegeben, umgeordnet, neue Druckversion geprüft; Papierabgleich, Nicht gestartet, Schließen/Wiederöffnen, Hinweis veröffentlichen/zurückziehen und TV-Rotation. Verwaltung bei 390/768/1440 px, Teilnehmerliste bei 390 px und TV bei 1920 × 1080 ohne Seitenüberlauf. Browser-PDF mit zwei vollständigen A4-Seiten, sieben Startern pro Klasse und langem Namen. Produktionsbuild und gezielter ESLint bestanden; App-Typecheck weiterhin 15 bekannte Fehler außerhalb der Änderungen. Details: [Verwaltungskonzept](finaltag-verwaltung-design.md).

## TV ohne Maus · 02.10.2026

Die TV-Seite nutzt die Browserhöhe und passt die Personenzahl an die längste Zeile aller gewählten Klassen an. Sie blättert automatisch durch sämtliche Seiten und Klassen, auch bei fixierter Klasse. Sanfte Übergänge laufen nur beim tatsächlichen Seitenwechsel; Ergebnisabrufe starten sie nicht neu. Die Klassenübersicht ist auf aktuelle Position und nächste Klasse begrenzt. Prüfung mit 82 synthetischen Personen, zwölf Klassen und vier Bildschirmgrößen; 424 Tests bestanden. Details und Screenshot: [TV-Anzeige ohne Maus](tv-anzeige-ohne-maus.md).
