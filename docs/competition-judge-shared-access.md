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
   Fünf-Minuten-Uhren. Nach einem Reload ist der Code erneut nötig; laufende
   Uhren bleiben auf demselben Gerät erhalten.
4. Bei Weitergabe an Unbefugte im Adminpanel „Neuen Code erzeugen“. Der alte
   Code schlägt bei der nächsten Prüfung (Fokus bzw. spätestens nach einer
   Minute bei sichtbarer Seite) fehl. Bereits kopierte oder gedruckte
   Routen-QR-Codes werden dadurch **nicht** ungültig.

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
- Keine Speicherung des Zugangscodes in localStorage oder sessionStorage;
  ein offener Tab hält ihn nur im Arbeitsspeicher. Bei Netzproblemen bleiben
  lokale Uhren sichtbar, während die Verbindung erneut geprüft werden muss.

Die Migration `20260924110000_competition_judge_shared_access.sql` legt nur eine
neue Tabelle und drei RPCs an. Sie ändert keine Qualifikations-, Anmelde- oder
Ergebniszeilen. Der Code wird nicht automatisch erzeugt und die
Wettkampfeingabe bleibt bis zur ausdrücklichen Admin-Freigabe geschlossen.
