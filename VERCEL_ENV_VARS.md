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

## Vercel Konfiguration

### Über Vercel Dashboard:
1. Gehe zu deinem Projekt in Vercel
2. Navigiere zu **Settings** → **Environment Variables**
3. Füge beide Variablen hinzu:
   - Name: `VITE_SUPABASE_URL`, Value: `https://[dein-project-ref].supabase.co`
   - Name: `VITE_SUPABASE_ANON_KEY`, Value: `[dein-anon-key]`
4. Stelle sicher, dass beide für alle Environments aktiviert sind (Production, Preview, Development)

### Über Vercel CLI:
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

## Wichtige Hinweise

- ⚠️ **NICHT** den `service_role` Key hier eintragen! Dieser gehört nur in Supabase Edge Functions und sollte niemals im Frontend-Code verwendet werden.
- Die Edge Functions (`invite-gym-admin`, `complete-gym-invite`, etc.) laufen auf Supabase und erhalten ihre Environment-Variablen automatisch von Supabase.
- Nach dem Hinzufügen der Variablen musst du einen neuen Deployment auslösen, damit die Änderungen wirksam werden.

## Verifizierung

Nach dem Deployment kannst du in der Browser-Konsole prüfen, ob die Variablen korrekt geladen wurden. Es sollte keine Warnung über fehlende Supabase-Variablen erscheinen.
