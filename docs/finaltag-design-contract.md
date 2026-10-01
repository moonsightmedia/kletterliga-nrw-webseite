# Finaltag: Bedien- und Darstellungskonzept

Stand 01.10.2026. Gilt für die tatsächliche Wettkampfzentrale, Finalstation, Teilnehmer-Rangliste und öffentliche TV-Seite. Die Entwicklungsdemo bindet dieselben React-Komponenten mit ausschließlich erfundenen Browserdaten ein.

## Zweck und Führung

René entscheidet je Klasse, was als Nächstes passiert. Die Übersicht kombiniert Klassenstatus, konkreten nächsten Schritt, Erklärung und direkten Einstieg. Bearbeitungsansichten zeigen immer die aktuelle Klasse und einen beschrifteten Klassenwechsel. Die fünf Ansichten bleiben erreichbar; laufende Klassen dürfen unabhängig voneinander fortschreiten.

1. Halbfinaleingabe schließen, fehlende Werte ausdrücklich klären.
2. Finalfeld mit Punktgleichen, physische Route und digitale Station bestätigen.
3. Startliste prüfen, gegebenenfalls umordnen und im separaten Drucktab ausgeben.
4. Klasse starten; die Zeitnahme erfasst manuell und bestätigt die Zusammenfassung.
5. Eingabe schließen, Papierabgleich vollständig durchführen, offiziell freigeben.

Routenpflege, Stationszugänge und Halbfinal-Grundkonfiguration sind aufklappbar. Sie sind bei fehlender Vorbereitung geöffnet. Alltägliche Ergebnisse und Entscheidungen werden dadurch nicht von Einrichtungsschritten verdrängt. Fehlende Gründe, fehlende Ergebnisse und bereits gestartete Personen deaktivieren die betroffenen Aktionen. Die Datenbank prüft erneut innerhalb der Transaktion.

## Design

Bestehende Stitch-Komponenten, Space Grotesk/Manrope und Kletterliga-Farben: Navy #003d55/#002637, Creme #f2dcab, Terracotta #a15523. Ein dunkler Orientierungskopf, nummerierte Ansichten, ruhige helle Arbeitsflächen, kräftige primäre Aktion, 12-px-Radien. Bestehende Radix-Auswahlmenüs mit expliziten zugänglichen Namen. Touchziele mindestens 40–48 px. Keine neue Bibliothek.

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
- Browserdruck: zwei freigegebene Klassen mit jeweils sieben Startern ergeben zwei nicht leere A4-Seiten. Lange Namen, Schreibfelder und Unterschriftsfelder wurden in der gerenderten PDF geprüft. Eine leere erste Seite wurde behoben.
- Lokal fehlen Supabase-Umgebungsvariablen und ein funktionierender isolierter Datenbankzugang. SQL-Rechte-/Transaktionstests und Renés tatsächliches Konto bleiben offen. Browserdaten sind kein Nachweis produktiver Datenbankrechte. Vor Produktivfreigabe Migrationen und SQL-Test in isolierter Umgebung ausführen, danach zwei Stationsgeräte, TV und echte Ausdrucke prüfen.
