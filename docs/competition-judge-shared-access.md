# Gemeinsamer Schiedsrichterzugang

Stand: 24.09.2026. Dieser Zugang betrifft ausschließlich die Halbfinal-Werkzeuge
unter `/app/schiedsrichter`. Schiedsrichter benötigen dort kein App-Konto.

## Einrichtung

1. Liga-Admin öffnet `/app/admin/league/wettkampf` und speichert mindestens
   einen Routenentwurf.
2. Unter „Schiedsrichterzugänge“ wird ein zufälliger 24-stelliger Code erzeugt.
   Er ist nur direkt danach sichtbar. Sicher übermitteln und in Bitwarden
   ablegen; nicht in Git, Notion, Obsidian oder Gruppen-Links veröffentlichen.
3. Schiedsrichter öffnen `https://www.kletterliga-nrw.de/app/schiedsrichter`
   und geben diesen Code ein. Sie erhalten Routen-QR-Codes und lokale
   Fünf-Minuten-Uhren. Nach erfolgreicher Prüfung bleibt der Zugang auf diesem
   Gerät für zwölf Stunden als Zugang gemerkt, auch nach Tab-Schließen.
   Beim nächsten Öffnen wird er vor Anzeige der QR-Codes erneut serverseitig
   geprüft. Laufende Uhren bleiben auf demselben Gerät erhalten.
4. Bei Weitergabe an Unbefugte im Adminpanel „Neuen Code erzeugen“. Der alte
   Code schlägt bei der nächsten Prüfung (Fokus bzw. spätestens nach einer
   Minute bei sichtbarer Seite) fehl. Bereits kopierte oder gedruckte
   Routen-QR-Codes werden dadurch **nicht** ungültig.

## Bedienung an der Route

- Die ausgewählten Stationsrouten bleiben auf demselben Gerät gespeichert.
  Laufende Uhren können nicht versehentlich aus der Ansicht entfernt werden.
- Jede Route hat eine eigene Uhr. Start, Pause/Fortsetzen und Zurücksetzen sind
  getrennt; Zurücksetzen verlangt eine Bestätigung. Bei 1:00 Restzeit wird die
  letzte Minute angezeigt, bei 0:00 muss die kletternde Person abgelassen werden.
- Über das QR-Symbol an einer Uhr öffnet sich der passende Routen-Code direkt.
  Laufende Zeiten bleiben im QR-Dialog und beim Wechsel zur QR-Übersicht sichtbar.
- Die Wettkampfphase wird angezeigt: Solange die Ergebniseingabe geschlossen
  ist, können Uhren getestet, aber keine Ergebnisse mit QR bestätigt werden.
- Signalton ist optional. Das Handy muss während der Zeitnahme sichtbar bleiben;
  Browser können Ton und Hinweise bei gesperrtem Bildschirm verzögern.

## Sicherheitsgrenzen

- Die Datenbank speichert nur einen gesalzenen Hash des Codes; die Tabelle hat
  keine direkten Rechte für öffentliche oder angemeldete App-Nutzer.
- Der anonyme Prüf-RPC gibt nur Routen-QR-Codes und die Wettkampfphase zurück.
  Ergebnisabgabe, Korrektur, Konfiguration und Teilnehmerdaten bleiben
  getrennt und serverseitig rollengeschützt.
- Der Code ist gemeinschaftlich: Es gibt keine individuelle Zurechenbarkeit,
  wer eine Uhr oder einen QR-Code angezeigt hat. Die Uhren sind lokal, keine
  offizielle Ergebnis-Zeitnahme.
- QR-Codes sind statisch und kopierbar. Das System ersetzt keine physische
  Aufsicht des Schiedsrichters an der Route.
- Der gemeinsame Code liegt nach erfolgreicher Eingabe im `localStorage` dieses
  Browserprofils; nach zwölf Stunden wird er nicht mehr akzeptiert und beim
  nächsten Öffnen gelöscht. Andere Personen mit Zugriff auf das
  entsperrte Gerät oder Skripte derselben Website können ihn innerhalb dieser
  Frist verwenden. Deshalb auf geteilten Geräten „Verlassen“ wählen; das löscht
  den gespeicherten Zugang. Bei Code-Rotation, Ablauf oder ungültigem Eintrag
  wird er ebenfalls entfernt. Eine automatische Freigabe ohne erneute
  Serverprüfung findet nicht statt. Bei Netzproblemen bleiben lokale Uhren
  sichtbar, während die Verbindung erneut geprüft werden muss.

Die Migration `20260924110000_competition_judge_shared_access.sql` legt nur eine
neue Tabelle und drei RPCs an. Sie ändert keine Qualifikations-, Anmelde- oder
Ergebniszeilen. Der Code wird nicht automatisch erzeugt und die
Wettkampfeingabe bleibt bis zur ausdrücklichen Admin-Freigabe geschlossen.
