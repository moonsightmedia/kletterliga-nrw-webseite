# 💰 Kostenlose Lösung: Custom Domain für Auth-Links

Diese Lösung verwendet **Vercel Serverless Functions** (kostenlos im Free Tier) als Proxy, damit die Auth-Links auf deine eigene Domain zeigen statt auf `*.supabase.co`.

## ✅ Vorteile

- ✅ **Komplett kostenlos** - Vercel Free Tier reicht aus
- ✅ **Keine Supabase Custom Domain nötig** - Funktioniert mit jedem Supabase-Plan
- ✅ **Links zeigen auf deine Domain** - `https://kletterliga-nrw.de/api/auth/verify`
- ✅ **Einfach einzurichten** - Nur ein paar Dateien und Template-Anpassungen

## 📋 Voraussetzungen

- Vercel Account (kostenlos)
- Projekt bereits auf Vercel deployed
- Zugriff auf Supabase Dashboard für E-Mail-Template-Änderungen

## 🚀 Schritt-für-Schritt Anleitung

### Schritt 1: Vercel Serverless Function erstellen

Die Datei `api/auth/verify.ts` wurde bereits erstellt. Diese Funktion:
- Nimmt Auth-Verifizierungsanfragen entgegen
- Leitet sie an Supabase weiter
- Zeigt auf deine Domain statt auf Supabase

**Die Datei ist bereits vorhanden:** `api/auth/verify.ts`

### Schritt 2: Vercel konfigurieren

Stelle sicher, dass die Environment-Variable `VITE_SUPABASE_URL` oder `SUPABASE_URL` in Vercel gesetzt ist:

1. Gehe zu Vercel Dashboard → Dein Projekt → Settings → Environment Variables
2. Füge hinzu (falls noch nicht vorhanden):
   - `SUPABASE_URL` = `https://ssxuurccefxfhxucgepo.supabase.co`
   - Oder stelle sicher, dass `VITE_SUPABASE_URL` gesetzt ist

### Schritt 3: E-Mail-Templates in Supabase anpassen

**WICHTIG:** Du musst die E-Mail-Templates in Supabase Dashboard manuell anpassen, um unsere eigene Domain zu verwenden.

#### Template 1: Confirm signup (Anmeldungsbestätigung)

**Wo:** Supabase Dashboard → Authentication → Email Templates → **Confirm signup**

**Änderung:** Ersetze `{{ .ConfirmationURL }}` durch unseren eigenen Link:

```html
<!-- ALT (Zeile 182): -->
<a href="{{ .ConfirmationURL }}" ...>

<!-- NEU: -->
<a href="https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=signup&redirect_to=https://kletterliga-nrw.de/app/auth/confirm" ...>
```

**Und für den Fallback-Link (Zeile 194):**

```html
<!-- ALT: -->
{{ .ConfirmationURL }}

<!-- NEU: -->
https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=signup&redirect_to=https://kletterliga-nrw.de/app/auth/confirm
```

#### Template 2: Reset Password (Passwort zurücksetzen)

**Wo:** Supabase Dashboard → Authentication → Email Templates → **Reset Password**

**Änderung:** Ersetze `{{ .ConfirmationURL }}` durch unseren eigenen Link:

```html
<!-- ALT (Button-Link): -->
<a href="{{ .ConfirmationURL }}" ...>

<!-- NEU: -->
<a href="https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=recovery&redirect_to=https://kletterliga-nrw.de/app/auth/reset-password" ...>
```

**Und für den Fallback-Link:**

```html
<!-- ALT: -->
{{ .ConfirmationURL }}

<!-- NEU: -->
https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=recovery&redirect_to=https://kletterliga-nrw.de/app/auth/reset-password
```

#### Template 3: Magic Link (falls verwendet)

**Wo:** Supabase Dashboard → Authentication → Email Templates → **Magic Link**

**Änderung:**

```html
<!-- ALT: -->
<a href="{{ .ConfirmationURL }}" ...>

<!-- NEU: -->
<a href="https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=magiclink&redirect_to=https://kletterliga-nrw.de/app/auth/confirm" ...>
```

#### Template 4: Invite user (Halle-Einladung)

**WICHTIG:** Für Invite-Links verwenden wir weiterhin `{{ .Data.invite_url }}`, da dies bereits ein custom Link ist.

**Keine Änderung nötig** - Die Invite-Funktion verwendet bereits einen eigenen Link.

### Schritt 4: Deployment

1. Committe die neue Datei `api/auth/verify.ts`:
   ```bash
   git add api/auth/verify.ts
   git commit -m "Add Vercel serverless function for auth verify proxy"
   git push
   ```

2. Vercel deployt automatisch (oder deploye manuell)

3. Teste den Endpoint:
   ```
   https://kletterliga-nrw.de/api/auth/verify?token=TEST&type=signup&redirect_to=https://kletterliga-nrw.de/app/auth/confirm
   ```
   Sollte zu Supabase weiterleiten.

### Schritt 5: Testen

1. **Registriere einen neuen Benutzer**
   - Prüfe die E-Mail
   - Der Link sollte auf `https://kletterliga-nrw.de/api/auth/verify` zeigen
   - Nach Klick sollte die Weiterleitung funktionieren

2. **Teste Passwort-Reset**
   - Gehe zu Profil → Passwort ändern
   - Prüfe die E-Mail
   - Der Link sollte auf `https://kletterliga-nrw.de/api/auth/verify` zeigen

## 📝 Vollständige Template-Beispiele

### Confirm signup - Vollständiges Template

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anmeldung bestätigen</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #003D55 0%, #005A7A 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Kletterliga NRW
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #003D55; font-size: 24px; font-weight: 600;">
                Willkommen bei der Kletterliga NRW!
              </h2>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hallo,
              </p>
              
              <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                vielen Dank für deine Anmeldung bei der <strong>Kletterliga NRW</strong>! 
                Bitte bestätige deine E-Mail-Adresse, indem du auf den Button unten klickst.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=signup&redirect_to=https://kletterliga-nrw.de/app/auth/confirm" style="display: inline-block; padding: 16px 32px; background-color: #003D55; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 2px 4px rgba(0, 61, 85, 0.2);">
                      E-Mail-Adresse bestätigen
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="margin: 30px 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
              </p>
              <p style="margin: 0 0 30px; padding: 12px; background-color: #f5f5f5; border-radius: 6px; word-break: break-all; color: #003D55; font-size: 14px; font-family: monospace;">
                https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=signup&redirect_to=https://kletterliga-nrw.de/app/auth/confirm
              </p>
              
              <!-- Info Box -->
              <div style="margin: 30px 0; padding: 16px; background-color: #f0f9ff; border-left: 4px solid #003D55; border-radius: 4px;">
                <p style="margin: 0; color: #003D55; font-size: 14px; line-height: 1.6;">
                  <strong>🎯 Nächste Schritte:</strong> Nach der Bestätigung kannst du dich anmelden und 
                  an der Kletterliga teilnehmen. Viel Erfolg beim Klettern!
                </p>
              </div>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Falls du dich nicht angemeldet hast, kannst du diese E-Mail ignorieren.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-align: center;">
                <strong>Kletterliga NRW</strong>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                Der landesweite Hallenkletter-Wettkampf in Nordrhein-Westfalen
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Reset Password - Vollständiges Template

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Passwort zurücksetzen</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #003D55 0%, #005A7A 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Kletterliga NRW
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #003D55; font-size: 24px; font-weight: 600;">
                Passwort zurücksetzen
              </h2>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hallo,
              </p>
              
              <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. 
                Klicke auf den Button unten, um ein neues Passwort festzulegen.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=recovery&redirect_to=https://kletterliga-nrw.de/app/auth/reset-password" style="display: inline-block; padding: 16px 32px; background-color: #003D55; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 2px 4px rgba(0, 61, 85, 0.2);">
                      Passwort zurücksetzen
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="margin: 30px 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
              </p>
              <p style="margin: 0 0 30px; padding: 12px; background-color: #f5f5f5; border-radius: 6px; word-break: break-all; color: #003D55; font-size: 14px; font-family: monospace;">
                https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=recovery&redirect_to=https://kletterliga-nrw.de/app/auth/reset-password
              </p>
              
              <!-- Info Box -->
              <div style="margin: 30px 0; padding: 16px; background-color: #fff4e6; border-left: 4px solid #A15523; border-radius: 4px;">
                <p style="margin: 0; color: #A15523; font-size: 14px; line-height: 1.6;">
                  <strong>🔒 Sicherheit:</strong> Dieser Link ist nur <strong>1 Stunde</strong> gültig. 
                  Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-align: center;">
                <strong>Kletterliga NRW</strong>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                Der landesweite Hallenkletter-Wettkampf in Nordrhein-Westfalen
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## 🔍 Verfügbare Template-Variablen

Supabase stellt folgende Variablen in E-Mail-Templates zur Verfügung:

- `{{ .Token }}` - Der Verifizierungs-Token
- `{{ .TokenHash }}` - Gehashte Version des Tokens
- `{{ .SiteURL }}` - Die Site URL aus Supabase Settings
- `{{ .RedirectTo }}` - Die Redirect-URL (falls angegeben)
- `{{ .ConfirmationURL }}` - Die vollständige Bestätigungs-URL (zeigt auf Supabase)

**Wir verwenden:** `{{ .Token }}` um unseren eigenen Link zu bauen.

## ⚠️ Wichtige Hinweise

1. **Token-Gültigkeit:** Die Token sind weiterhin von Supabase generiert und haben die gleiche Gültigkeitsdauer
2. **Sicherheit:** Die Proxy-Funktion leitet nur weiter - keine Token-Verarbeitung
3. **Fallback:** Falls der Proxy nicht funktioniert, können Benutzer den Link manuell anpassen (Token bleibt gleich)

## 🐛 Troubleshooting

### Problem: Links funktionieren nicht

**Lösung:**
- Prüfe, ob `api/auth/verify.ts` deployed wurde
- Prüfe Vercel Logs auf Fehler
- Stelle sicher, dass `SUPABASE_URL` Environment-Variable gesetzt ist

### Problem: Template-Variablen werden nicht ersetzt

**Lösung:**
- Stelle sicher, dass du `{{ .Token }}` verwendest (mit Leerzeichen!)
- Prüfe, ob das Template korrekt in Supabase gespeichert wurde

### Problem: Weiterleitung funktioniert nicht

**Lösung:**
- Prüfe, ob die Redirect-URLs in Supabase korrekt konfiguriert sind
- Stelle sicher, dass `/app/auth/confirm` und `/app/auth/reset-password` existieren

## ✅ Checkliste

- [ ] `api/auth/verify.ts` erstellt
- [ ] `SUPABASE_URL` Environment-Variable in Vercel gesetzt
- [ ] Confirm signup Template angepasst
- [ ] Reset Password Template angepasst
- [ ] Magic Link Template angepasst (falls verwendet)
- [ ] Deployment durchgeführt
- [ ] Test-Registrierung durchgeführt
- [ ] Test-Passwort-Reset durchgeführt
- [ ] Links zeigen auf `kletterliga-nrw.de/api/auth/verify`

## 🎉 Ergebnis

Nach der Einrichtung zeigen alle Auth-Links auf deine Domain:
- ✅ `https://kletterliga-nrw.de/api/auth/verify?token=...`
- ✅ Keine `*.supabase.co` Links mehr in E-Mails
- ✅ Professionelles Branding
- ✅ E-Mail-Provider markieren Links nicht als "unsicher"

**Komplett kostenlos!** 🎊
