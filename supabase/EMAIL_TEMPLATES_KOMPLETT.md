# Komplette E-Mail-Templates für Supabase

Diese Datei enthält alle E-Mail-Templates für die Kletterliga NRW, die in Supabase konfiguriert werden müssen.

## 📋 Übersicht der Mail-Typen

1. **Invite user** - Halle-Einladung
2. **Confirm signup** - Anmeldungsbestätigung
3. **Reset Password** - Passwort zurücksetzen
4. **Magic Link** - Magic Link Login (optional)

---

## ⚙️ Wichtige Konfiguration

### Site URL und Redirect URLs

Stelle sicher, dass in **Supabase Dashboard** → **Project Settings** → **Auth** → **URL Configuration** folgendes konfiguriert ist:

- **Site URL**: `https://kletterliga-nrw.de`
- **Redirect URLs**:
  - `https://kletterliga-nrw.de/app/auth/confirm`
  - `https://kletterliga-nrw.de/app/auth/reset-password`
  - `https://kletterliga-nrw.de/app/invite/gym/*`
  - `https://kletterliga-nrw.de/**` (für alle anderen Redirects)
  - `http://localhost:8081/app/auth/confirm` (für lokale Entwicklung)
  - `http://localhost:8081/app/auth/reset-password` (für lokale Entwicklung)
  - `http://localhost:8081/app/invite/gym/*` (für lokale Entwicklung)
  - `http://localhost:8081/**` (für lokale Entwicklung)

---

## 1️⃣ TEMPLATE: Invite user (Halle-Einladung)

**Wo einfügen:** Authentication → Email Templates → **Invite user**

**Verwendete Links:**
- `{{ .Data.invite_url }}` - Custom Link: `https://kletterliga-nrw.de/app/invite/gym/[token]`
- `{{ .ConfirmationURL }}` - Fallback Supabase-Link

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Einladung zur Halle-Registrierung</title>
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
                Einladung zur Halle-Registrierung
              </h2>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hallo,
              </p>
              
              <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                du wurdest eingeladen, eine Halle für die <strong>Kletterliga NRW</strong> zu registrieren. 
                Erstelle jetzt dein Hallen-Profil und werde Teil unserer Liga!
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="{{ .Data.invite_url }}" style="display: inline-block; padding: 16px 32px; background-color: #003D55; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 2px 4px rgba(0, 61, 85, 0.2);">
                      Halle jetzt registrieren
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Info Box -->
              <div style="margin: 30px 0; padding: 16px; background-color: #f0f9ff; border-left: 4px solid #003D55; border-radius: 4px;">
                <p style="margin: 0; color: #003D55; font-size: 14px; line-height: 1.6;">
                  <strong>⏰ Wichtig:</strong> Dieser Link ist <strong>7 Tage</strong> gültig. 
                  Nach Ablauf kannst du einen neuen Link bei einem Liga-Admin anfordern.
                </p>
              </div>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Falls du diese Einladung nicht angefordert hast, kannst du diese E-Mail ignorieren.
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

---

## 2️⃣ TEMPLATE: Confirm signup (Anmeldungsbestätigung)

**Wo einfügen:** Authentication → Email Templates → **Confirm signup**

**Verwendete Links:**
- `{{ .ConfirmationURL }}` - Link zur Bestätigung: `https://kletterliga-nrw.de/app/auth/confirm`

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
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 32px; background-color: #003D55; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 2px 4px rgba(0, 61, 85, 0.2);">
                      E-Mail-Adresse bestätigen
                    </a>
                  </td>
                </tr>
              </table>
              
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

---

## 3️⃣ TEMPLATE: Reset Password (Passwort zurücksetzen)

**Wo einfügen:** Authentication → Email Templates → **Reset Password**

**Verwendete Links:**
- `{{ .ConfirmationURL }}` - Link zum Passwort-Reset: `https://kletterliga-nrw.de/app/auth/reset-password`

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
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 32px; background-color: #003D55; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 2px 4px rgba(0, 61, 85, 0.2);">
                      Passwort zurücksetzen
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Info Box -->
              <div style="margin: 30px 0; padding: 16px; background-color: #fff4e6; border-left: 4px solid #A15523; border-radius: 4px;">
                <p style="margin: 0; color: #A15523; font-size: 14px; line-height: 1.6;">
                  <strong>🔒 Sicherheit:</strong> Dieser Link ist nur <strong>1 Stunde</strong> gültig. 
                  Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.
                </p>
              </div>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Falls du Probleme hast, kontaktiere bitte einen Liga-Admin.
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

---

## 4️⃣ TEMPLATE: Magic Link (Passwortloser Login)

**Wo einfügen:** Authentication → Email Templates → **Magic Link**

**Verwendete Links:**
- `{{ .ConfirmationURL }}` - Link zum Login: `https://kletterliga-nrw.de/app/auth/confirm`

**Hinweis:** Magic Link wird aktuell nicht aktiv verwendet, aber das Template sollte trotzdem konfiguriert sein für zukünftige Nutzung.

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Magic Link Login</title>
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
                Passwortloser Login
              </h2>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hallo,
              </p>
              
              <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                du hast einen Magic Link für die <strong>Kletterliga NRW</strong> angefordert. 
                Klicke auf den Button unten, um dich ohne Passwort anzumelden.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 32px; background-color: #003D55; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 2px 4px rgba(0, 61, 85, 0.2);">
                      Jetzt anmelden
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Info Box -->
              <div style="margin: 30px 0; padding: 16px; background-color: #f0f9ff; border-left: 4px solid #003D55; border-radius: 4px;">
                <p style="margin: 0; color: #003D55; font-size: 14px; line-height: 1.6;">
                  <strong>🔐 Sicherheit:</strong> Dieser Link ist nur <strong>1 Stunde</strong> gültig und kann nur einmal verwendet werden. 
                  Falls du diesen Login nicht angefordert hast, kannst du diese E-Mail ignorieren.
                </p>
              </div>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Falls du Probleme hast, kontaktiere bitte einen Liga-Admin.
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

---

## 📝 Anleitung zum Einfügen

1. Gehe zum [Supabase Dashboard](https://supabase.com/dashboard)
2. Wähle dein Projekt aus
3. Navigiere zu **Authentication** → **Email Templates**
4. Wähle das entsprechende Template aus:
   - **Invite user** für Halle-Einladungen
   - **Confirm signup** für Anmeldungsbestätigung
   - **Reset Password** für Passwort-Reset
   - **Magic Link** für passwortlosen Login (optional)
5. Kopiere das entsprechende HTML-Template oben
6. Füge es in das Template-Feld ein
7. Klicke auf **Save**

## ✅ Nach dem Einfügen testen

- **Invite user**: Sende eine Test-Einladung für eine Halle
- **Confirm signup**: Registriere einen neuen Benutzer
- **Reset Password**: Teste die Passwort-Reset-Funktion
- **Magic Link**: Teste passwortlosen Login (falls aktiviert)

## 🎨 Design-Farben

Alle Templates verwenden die Kletterliga-Farben:
- **Dunkelblau**: `#003D55` (Primärfarbe)
- **Hellblau**: `#005A7A` (Gradient)
- **Braun**: `#A15523` (nur bei Passwort-Reset Info-Box)
- **Beige**: `#F2DCAB` (als Akzent)

## 🔗 Link-Struktur

Alle Links zeigen auf die eigene Domain (`kletterliga-nrw.de`) statt auf Supabase-Domains:
- ✅ `https://kletterliga-nrw.de/app/auth/confirm` - E-Mail-Bestätigung & Magic Link
- ✅ `https://kletterliga-nrw.de/app/auth/reset-password` - Passwort-Reset
- ✅ `https://kletterliga-nrw.de/app/invite/gym/[token]` - Halle-Einladung

Dies stellt sicher, dass E-Mail-Provider die Links nicht als "unsicher" markieren.

## 💡 Magic Link aktivieren (optional)

Falls du Magic Link für passwortloses Login aktivieren möchtest:

1. **In Supabase Dashboard:**
   - Gehe zu **Authentication** → **Providers**
   - Aktiviere **Email** Provider (falls noch nicht aktiviert)
   - Magic Link ist standardmäßig aktiviert, wenn Email Provider aktiviert ist

2. **Im Frontend Code:**
   ```typescript
   // Beispiel für Magic Link Login
   const { error } = await supabase.auth.signInWithOtp({
     email: 'user@example.com',
     options: {
       emailRedirectTo: 'https://kletterliga-nrw.de/app/auth/confirm'
     }
   });
   ```

3. **Template konfigurieren:**
   - Verwende das Magic Link Template oben in Supabase Dashboard
   - Die Route `/app/auth/confirm` verarbeitet sowohl E-Mail-Bestätigung als auch Magic Link
