# Roadmap: Zentrale Ranglisten-Auswertung (vor nächster Saison)

**Status:** Geplant — vor Start der nächsten Saison umsetzen  
**Priorität:** Prio 10 (langfristige Stabilität der Punkteauswertung)  
**Stand der Diskussion:** Mai 2026

---

## Kurz in Alltagssprache

Aktuell rechnen **App**, **öffentliche Website** und **Admin (Etappensieger)** die Rangliste jeweils selbst — mit angeglichener Logik, aber an **mehreren Stellen** im Code.

**Ziel:** Eine **einzige offizielle Auswertung** in der Datenbank. App, Website und Admin fragen nur noch diese eine Quelle ab. Dann können die angezeigten Punkte und Platzierungen **nicht mehr auseinanderlaufen** (wie im Natalie-Fall / Instagram-Post 2026).

---

## Warum vor der nächsten Saison?

- Saison 2026: kritische Fixes sind umgesetzt (Pagination, Saison-Filter, Admin Etappensieger, konsistente Klassen).
- Vor Saisonstart 2027 (oder nächster Qualifikationsrunde): **keine Diskussionen mehr** über „App vs. Website vs. Post“ — eine Wahrheit für alle Kanäle.
- Neue oder geänderte Wertungsregeln müssen dann nur **einmal** gepflegt werden.

---

## Was technisch zu tun ist (für Entwicklung)

1. **Neue Supabase-RPC** (z. B. `get_ranking_rows`) in Postgres:
   - Parameter: Liga (`toprope` / `lead`), Hauptklasse (`U15` / `Ü15` / `Ü40` × m/w), optional Etappen-Key
   - Filter: Qualifikationszeitraum, Etappenzeitraum, `participation_activated_at`, archivierte Profile/Hallen
   - Punkte: Zonenwertung + Flash-Bonus (+1)
   - Ausgabe: Rang, Profil-ID/Name, Punkte

2. **App** (`participantData.ts` / Rankings): RPC aufrufen statt `buildRankingRows*` clientseitig (oder Hybrid: RPC für Punkte, UI bleibt).

3. **Website** (`get_public_rankings` / `Ranglisten.tsx`): auf dieselbe RPC umstellen.

4. **Admin** (`LeagueStageWinners.tsx`): auf dieselbe RPC umstellen.

5. **Tests** mit festen Fixture-Daten (Saison, Etappe, Grenzfälle Stichtag / Etappenende).

**Referenz-Logik heute (bis zur Migration):**

- `src/app/pages/participant/participantData.ts` — `buildRankingRowsForScope`, `buildSeasonRangeFromQualification`, `getStageRange`
- `supabase/migrations/…` — `get_public_rankings`
- `src/app/pages/admin/LeagueStageWinners.tsx`

---

## Vorteile

- Eine Regel, ein Ergebnis — überall gleich
- Weniger Risiko bei Regeländerungen
- Weniger manuelle / doppelte Auswertung

## Nachteile / Risiken

- Einmaliger Umbau-Aufwand
- Fehler in der zentralen Logik betreffen alle Kanäle gleichzeitig
- Rangliste hängt stärker an Server-Verfügbarkeit

---

## Bereits erledigt (Saison 2026, nicht nochmal nötig)

- Pagination bei Ergebnis-Abfragen (`get-participant-competition-data`, `get-gym-community-stats`)
- Saison-Filter in der App = Qualifikationszeitraum
- Admin-Seite **Etappensieger** (`/app/admin/league/stage-winners`)
- Home-Link zur Etappen-Ansicht, Dashboard-Platz wie Rangliste
- Altersgrenze U15/Ü15 in Altersklassen angeglichen

---

## Checkliste vor Go-Live nächste Saison

- [ ] RPC designed und in Migration eingecheckt
- [ ] App-Ranglisten nutzen RPC
- [ ] Website nutzt RPC
- [ ] Admin Etappensieger nutzt RPC
- [ ] Abgleich: Stichprobe App = Website = Admin-Export
- [ ] Dokumentation für Liga-Admins: „Offizielle Quelle ist immer das System, nicht Excel/Instagram-Handrechnung“
