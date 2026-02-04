# Test-Teilnehmer erstellen

Es gibt zwei Möglichkeiten, Test-Teilnehmer zu erstellen:

## Option 1: Über Supabase Dashboard (Empfohlen)

1. Gehe zu Supabase Dashboard → Authentication → Users
2. Klicke auf "Add User" → "Create new user"
3. Erstelle die folgenden Benutzer:
   - max.mustermann@example.com (Passwort: test123)
   - sarah.schmidt@example.com (Passwort: test123)
   - tom.weber@example.com (Passwort: test123)
   - lisa.mueller@example.com (Passwort: test123)
   - felix.bauer@example.com (Passwort: test123)
   - emma.fischer@example.com (Passwort: test123)
   - noah.klein@example.com (Passwort: test123)
   - sophia.hoffmann@example.com (Passwort: test123)
   - lukas.wagner@example.com (Passwort: test123)
   - mia.becker@example.com (Passwort: test123)

4. Führe dann das SQL-Skript `insert_profiles_for_existing_users.sql` aus, um die Profile zu erstellen

## Option 2: SQL-Skript mit Funktion

Führe `create_test_users_function.sql` im Supabase SQL Editor aus.
**Hinweis:** Dies erfordert Service Role Berechtigungen und funktioniert möglicherweise nicht in allen Supabase-Instanzen.

## Option 3: Node.js Script

1. Füge `SUPABASE_SERVICE_ROLE_KEY` zu `.env.local` hinzu (findest du im Supabase Dashboard unter Settings → API)
2. Führe aus: `node scripts/create-test-participants.js`
