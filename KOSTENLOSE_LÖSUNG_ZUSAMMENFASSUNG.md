# 💰 Kostenlose Lösung: Custom Domain für Auth-Links - Schnellstart

## ✅ Was wurde gemacht?

1. **Vercel Serverless Function erstellt** (`api/auth/verify.ts`)
   - Leitet Auth-Verifizierungsanfragen an Supabase weiter
   - Zeigt auf deine Domain: `https://kletterliga-nrw.de/api/auth/verify`

2. **Vercel-Konfiguration angepasst** (`vercel.json`)
   - API-Routen werden korrekt geroutet

## 🚀 Nächste Schritte (DU musst das machen)

### 1. Deployment

```bash
git add api/auth/verify.ts vercel.json
git commit -m "Add free custom domain solution for auth links"
git push
```

Vercel deployt automatisch.

### 2. Environment-Variable prüfen

Stelle sicher, dass in Vercel gesetzt ist:
- `VITE_SUPABASE_URL` oder `SUPABASE_URL` = `https://ssxuurccefxfhxucgepo.supabase.co`

**Wo:** Vercel Dashboard → Projekt → Settings → Environment Variables

### 3. E-Mail-Templates in Supabase anpassen

**WICHTIG:** Du musst die Templates im Supabase Dashboard manuell ändern!

#### Template: Confirm signup

**Wo:** Supabase Dashboard → Authentication → Email Templates → **Confirm signup**

**Ändere diese Zeilen:**

```html
<!-- ALT (Button): -->
<a href="{{ .ConfirmationURL }}" ...>

<!-- NEU: -->
<a href="https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=signup&redirect_to=https://kletterliga-nrw.de/app/auth/confirm" ...>
```

```html
<!-- ALT (Fallback-Link): -->
{{ .ConfirmationURL }}

<!-- NEU: -->
https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=signup&redirect_to=https://kletterliga-nrw.de/app/auth/confirm
```

#### Template: Reset Password

**Wo:** Supabase Dashboard → Authentication → Email Templates → **Reset Password**

**Ändere:**

```html
<!-- ALT: -->
<a href="{{ .ConfirmationURL }}" ...>

<!-- NEU: -->
<a href="https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=recovery&redirect_to=https://kletterliga-nrw.de/app/auth/reset-password" ...>
```

```html
<!-- ALT: -->
{{ .ConfirmationURL }}

<!-- NEU: -->
https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=recovery&redirect_to=https://kletterliga-nrw.de/app/auth/reset-password
```

#### Template: Magic Link (falls verwendet)

**Wo:** Supabase Dashboard → Authentication → Email Templates → **Magic Link**

**Ändere:**

```html
<!-- ALT: -->
<a href="{{ .ConfirmationURL }}" ...>

<!-- NEU: -->
<a href="https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=magiclink&redirect_to=https://kletterliga-nrw.de/app/auth/confirm" ...>
```

### 4. Testen

1. Registriere einen neuen Benutzer
2. Prüfe die E-Mail
3. Der Link sollte auf `https://kletterliga-nrw.de/api/auth/verify` zeigen
4. Nach Klick sollte alles funktionieren

## 📚 Vollständige Anleitung

Siehe: `supabase/KOSTENLOSE_CUSTOM_DOMAIN_LÖSUNG.md`

## ✅ Ergebnis

Nach der Einrichtung:
- ✅ Links zeigen auf `https://kletterliga-nrw.de/api/auth/verify`
- ✅ Keine `*.supabase.co` Links mehr
- ✅ Komplett kostenlos (Vercel Free Tier)
- ✅ Keine Supabase Custom Domain nötig

## 🐛 Probleme?

- Prüfe Vercel Logs auf Fehler
- Stelle sicher, dass `SUPABASE_URL` gesetzt ist
- Prüfe, ob Templates korrekt gespeichert wurden
