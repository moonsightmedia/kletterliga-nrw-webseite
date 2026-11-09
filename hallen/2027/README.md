# Hallenrückmeldungen 2027

Lokale Vorschau starten:

```sh
npm ci
npm exec -- vite --config vite.hallenrunde.config.ts
```

- Formular: http://127.0.0.1:8787/hallen/2027/ · Hallencodes werden lokal über `.codex-tmp/hallenrunde-invites.json` eingespielt.
- Übersicht: http://127.0.0.1:8787/hallen/2027/uebersicht/
- Testdaten liegen im lokalen Postgres-Verzeichnis `.codex-tmp/hallenrunde-postgres` und bleiben beim Neustart erhalten. Vite bindet nur an die Loopback-Adresse. Die Vorschau benötigt keine Produktionszugangsdaten und verbindet sich nicht mit dem Online-Projekt.
- Integrationstest: `npm exec -- vitest run --config vitest.hallenrunde.config.ts` (separate temporäre Datenbank).

Die lokale Vorschau führt die echte SQL-Migration auf eingebettetem PostgreSQL (PGlite) aus. Die bereits vorhandenen Supabase-Authobjekte werden im Test nachgebildet. Der Formularserver ruft in der Vorschau und im Onlinebetrieb dieselben Datenbankfunktionen auf. Der lokale Lauf ersetzt keinen Smoke-Test über das echte Supabase-Auth- und REST-Gateway.

Für die spätere Aktivierung nach Freigabe:

1. Die Migration `20261109120000_hallenrunde_2027.sql` auf das vorhandene Supabase-Projekt anwenden. Dort gibt es anfangs keine Hallen oder Antworten.
2. Die freigegebenen Hallen als Einträge in `public.hallenrunde_2027_halls` anlegen. Jeder Code sollte aus mindestens 16 zufällig erzeugten Hex-Zeichen bestehen (z. B. mit `randomBytes(8).toString("hex").toUpperCase()`). Als `code_hash` wird der SHA-256-Hexwert des Codes ohne Leerzeichen und Trennstriche in Großschreibung gespeichert. Codes nur einzeln an die jeweiligen Hallen weitergeben, nicht in Git oder der Adminübersicht speichern. Bei Bedarf den Hash rotieren oder den Hallenzugang deaktivieren; beides entzieht bestehenden Sitzungen Schreibzugriff.
3. Die Supabase Edge Function `hallenrunde-2027` deployen. Die Vercel-API nutzt die vorhandene `VITE_SUPABASE_URL` und leitet nur das Hallensitzungscookie an Supabase weiter. Der Service-Schlüssel bleibt in Supabase. Das Formular liegt unter `/hallen/2027/`, die Übersicht unter `/app/admin/league/hallenrunde-2027` im vorhandenen Liga-Adminbereich.
4. Formular und bestehende Adminanmeldung über die Zielumgebung mit einem eigenen Testeintrag prüfen; den Testeintrag anschließend entfernen.
