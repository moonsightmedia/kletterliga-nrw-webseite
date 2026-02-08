# Environment-Variablen für Vercel Deployment

Für das Deployment auf Vercel benötigst du folgende Environment-Variablen:

## Erforderliche Variablen

### 1. `VITE_SUPABASE_URL`
- **Beschreibung**: Die URL deines Supabase-Projekts
- **Format**: `https://[project-ref].supabase.co`
- **Beispiel**: `https://ssxuurccefxfhxucgepo.supabase.co`
- **Wo findest du es**: Supabase Dashboard → Project Settings → API → Project URL

### 2. `VITE_SUPABASE_ANON_KEY`
- **Beschreibung**: Der anonyme/public Supabase API Key (für Client-seitige Zugriffe)
- **Format**: Lang string, beginnt mit `eyJ...`
- **Beispiel**: `sb_publishable__28S5sFkRJtonydKMS1feA_HMFGlmNM`
- **Wo findest du es**: Supabase Dashboard → Project Settings → API → Project API keys → `anon` `public` key
- **Wichtig**: Dieser Key ist sicher für Client-seitige Verwendung (wird durch RLS geschützt)

## Optionale Variablen (Closed/Coming Soon)

Wenn die Webseite vor dem offiziellen Start (z. B. bis 1. März) nur für Tester sichtbar sein soll, kannst du folgende Variablen setzen:

### 3. `VITE_SITE_LIVE` (optional)
- **Beschreibung**: Schaltet die „Closed“-Coming-Soon-Seite ab. Wenn gesetzt, wird die normale Webseite für alle angezeigt.
- **Werte**: `true` oder `1` = Webseite ist live; nicht gesetzt oder anderer Wert = Coming-Soon-Seite mit Countdown und Passwort-Link wird angezeigt.
- **Beispiel**: Ab Go-Live (z. B. 1. März) in Vercel setzen: `VITE_SITE_LIVE=true` und neu deployen.

### 4. `VITE_PREVIEW_PASSWORD` (optional)
- **Beschreibung**: Passwort für Tester, um die Webseite vor dem offiziellen Start zu öffnen („Für Tester: Zugang mit Passwort“).
- **Format**: Beliebiger String; wird client-seitig verglichen (nur zur Abschirmung, kein Schutz gegen gezieltes Reverse-Engineering).
- **Hinweis**: Wenn nicht gesetzt, wird der Passwort-Link auf der Coming-Soon-Seite ausgeblendet.

## Vercel Konfiguration

### Über Vercel Dashboard:
1. Gehe zu deinem Projekt in Vercel
2. Navigiere zu **Settings** → **Environment Variables**
3. Füge die erforderlichen Variablen hinzu:
   - Name: `VITE_SUPABASE_URL`, Value: `https://[dein-project-ref].supabase.co`
   - Name: `VITE_SUPABASE_ANON_KEY`, Value: `[dein-anon-key]`
4. Optional (Closed-Seite): `VITE_SITE_LIVE` (z. B. `true` ab Go-Live), `VITE_PREVIEW_PASSWORD` (Passwort für Tester).
5. Stelle sicher, dass die Variablen für die gewünschten Environments aktiviert sind (Production, Preview, Development).

### Über Vercel CLI:
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
# Optional:
vercel env add VITE_SITE_LIVE
vercel env add VITE_PREVIEW_PASSWORD
```

## Wichtige Hinweise

- ⚠️ **NICHT** den `service_role` Key hier eintragen! Dieser gehört nur in Supabase Edge Functions und sollte niemals im Frontend-Code verwendet werden.
- Die Edge Functions (`invite-gym-admin`, `complete-gym-invite`, etc.) laufen auf Supabase und erhalten ihre Environment-Variablen automatisch von Supabase.
- Nach dem Hinzufügen der Variablen musst du einen neuen Deployment auslösen, damit die Änderungen wirksam werden.

## Verifizierung

Nach dem Deployment kannst du in der Browser-Konsole prüfen, ob die Variablen korrekt geladen wurden. Es sollte keine Warnung über fehlende Supabase-Variablen erscheinen.
