# Supabase Edge Functions deployen (Deutsch)

## Erledigt

- **Supabase CLI** ist als Projekt-Abhängigkeit eingetragen (`npm install` erledigt).
- **Scripts** in `package.json`: `npm run supabase` und `npm run supabase:deploy`.

## Schritte zum Deploy der Function `create-gym-admin`

### 1. Bei Supabase anmelden

Im Projektordner in der Konsole:

```powershell
npx supabase login
```

Im Browser anmelden und den Zugang bestätigen.

### 2. Projekt verknüpfen

Projekt-Ref aus deiner Supabase-URL (z. B. `https://ssxuurccefxfhxucgepo.supabase.co` → Ref: `ssxuurccefxfhxucgepo`):

```powershell
npx supabase link --project-ref ssxuurccefxfhxucgepo
```

Falls du eine andere Projekt-URL hast, ersetze `ssxuurccefxfhxucgepo` durch deinen Projekt-Ref.

### 3. Edge Function deployen

```powershell
npx supabase functions deploy create-gym-admin
```

Die `config.toml` mit `verify_jwt = false` wird dabei mit ausgeliefert, die Function sollte danach ohne 401 laufen.

### Alternative: JWT in Supabase Dashboard ausschalten

Falls du die CLI nicht nutzen willst oder das Link fehlschlägt:

1. Im [Supabase Dashboard](https://supabase.com/dashboard) dein Projekt öffnen.
2. **Edge Functions** → **create-gym-admin** auswählen.
3. In den Einstellungen der Function **Verify JWT** deaktivieren.

Die App sendet weiterhin den Auth-Header; die Function kann dann mit deiner eigenen Prüfung arbeiten.

---

**Kurz:** Nach `npx supabase login` und `npx supabase link --project-ref DEIN_REF` reicht  
`npx supabase functions deploy create-gym-admin`.
