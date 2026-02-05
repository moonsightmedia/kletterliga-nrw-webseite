# Anleitung: Migrationen ausführen

## Problem
- Doppelte Ergebnisse für dieselbe Route werden erstellt
- Punkte werden in der öffentlichen Rangliste nicht angezeigt

## Lösung

Es gibt zwei Möglichkeiten, die Migrationen auszuführen:

### Option 1: Über den Supabase SQL Editor (EMPFOHLEN - Einfachste Methode)

1. **Öffne dein Supabase Dashboard**
   - Gehe zu https://supabase.com/dashboard
   - Wähle dein Projekt aus

2. **Öffne den SQL Editor**
   - Klicke auf "SQL Editor" im linken Menü
   - Oder gehe direkt zu: https://supabase.com/dashboard/project/[dein-project]/sql/new

3. **Öffne die Datei `supabase/apply_fixes.sql`**
   - Die Datei enthält alle notwendigen Änderungen

4. **Kopiere den gesamten Inhalt** der Datei

5. **Füge ihn in den SQL Editor ein**

6. **Klicke auf "Run"** (oder drücke Strg+Enter)

7. **Prüfe das Ergebnis**
   - Es sollte eine Erfolgsmeldung erscheinen
   - Die Migrationen wurden ausgeführt

### Option 2: Über die Supabase CLI (Falls installiert)

```bash
# Installiere die Supabase CLI (falls noch nicht installiert)
npm install -g supabase

# Login zu Supabase
supabase login

# Linke dein lokales Projekt mit Supabase
supabase link --project-ref [dein-project-ref]

# Führe die Migrationen aus
supabase db push
```

## Was wird geändert?

1. **Doppelte Ergebnisse entfernen**
   - Behält nur den neuesten Eintrag pro (profile_id, route_id)
   - Löscht alle älteren Duplikate

2. **Unique Constraint hinzufügen**
   - Verhindert zukünftige doppelte Einträge
   - Eine Person kann nur ein Ergebnis pro Route haben

3. **RPC-Funktion korrigieren**
   - Verbessertes NULL-Handling in der Punkteberechnung
   - Punkte werden jetzt korrekt angezeigt

## Nach der Migration

- Die Code-Änderungen in `src/services/appApi.ts` sind bereits gespeichert
- Beim nächsten Deployment werden die Änderungen aktiv
- Die öffentliche Rangliste sollte jetzt die Punkte korrekt anzeigen

## Troubleshooting

**Falls Fehler auftreten:**

1. Prüfe, ob du die richtigen Berechtigungen hast (Project Owner oder Admin)
2. Stelle sicher, dass keine anderen Prozesse gleichzeitig auf die Datenbank zugreifen
3. Prüfe die Fehlermeldung im SQL Editor - sie zeigt an, was schiefgelaufen ist

**Falls die Punkte immer noch nicht angezeigt werden:**

1. Prüfe, ob die Teilnehmer Ergebnisse im Qualifikationszeitraum haben
2. Prüfe die `admin_settings` Tabelle - sind `qualification_start` und `qualification_end` korrekt gesetzt?
3. Prüfe die Browser-Konsole auf Fehler beim Laden der Rangliste
