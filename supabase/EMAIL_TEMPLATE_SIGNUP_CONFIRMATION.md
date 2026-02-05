# E-Mail-Template für Anmeldungsbestätigung

## WICHTIG: Dieses Template muss in Supabase eingefügt werden!

Gehe zu: **Authentication** → **Email Templates** → **Confirm signup**

Kopiere den gesamten HTML-Code unten und füge ihn in das Template ein.

## HTML-Template (schön gestaltet)

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
              
              <!-- Alternative Link -->
              <p style="margin: 30px 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
              </p>
              <p style="margin: 0 0 30px; padding: 12px; background-color: #f5f5f5; border-radius: 6px; word-break: break-all; color: #003D55; font-size: 14px; font-family: monospace;">
                {{ .ConfirmationURL }}
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

## Einfacheres Template (falls HTML-Probleme)

Falls das HTML-Template Probleme macht, hier eine einfachere Version:

```html
<h2 style="color: #003D55; font-size: 24px; margin-bottom: 20px;">Willkommen bei der Kletterliga NRW!</h2>

<p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
  Hallo,
</p>

<p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
  vielen Dank für deine Anmeldung bei der <strong>Kletterliga NRW</strong>! 
  Bitte bestätige deine E-Mail-Adresse, indem du auf den Button unten klickst.
</p>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 32px; background-color: #003D55; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
    E-Mail-Adresse bestätigen
  </a>
</div>

<p style="font-size: 14px; color: #666666; margin-top: 30px;">
  Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
  <span style="word-break: break-all; color: #003D55;">{{ .ConfirmationURL }}</span>
</p>

<div style="margin: 30px 0; padding: 16px; background-color: #f0f9ff; border-left: 4px solid #003D55;">
  <p style="margin: 0; color: #003D55; font-size: 14px;">
    <strong>🎯 Nächste Schritte:</strong> Nach der Bestätigung kannst du dich anmelden und 
    an der Kletterliga teilnehmen. Viel Erfolg beim Klettern!
  </p>
</div>

<p style="font-size: 14px; color: #666666; margin-top: 30px;">
  Falls du dich nicht angemeldet hast, kannst du diese E-Mail ignorieren.
</p>

<p style="margin-top: 40px; font-size: 12px; color: #999999; text-align: center;">
  Kletterliga NRW - Der landesweite Hallenkletter-Wettkampf in Nordrhein-Westfalen
</p>
```

## WICHTIG: Template-Variablen

Das Template verwendet:
- `{{ .ConfirmationURL }}` - Der Link zur Bestätigung der E-Mail-Adresse
- `{{ .Email }}` - Die E-Mail-Adresse des Empfängers
- `{{ .Token }}` - Der Bestätigungstoken (falls benötigt)

## Anleitung zum Einfügen

1. Gehe zum [Supabase Dashboard](https://supabase.com/dashboard)
2. Wähle dein Projekt aus
3. Navigiere zu **Authentication** → **Email Templates**
4. Wähle **Confirm signup** aus
5. Kopiere eines der Templates oben
6. Füge es in das Template-Feld ein
7. Klicke auf **Save**

## Prüfen nach dem Speichern

Nach dem Speichern:
1. Teste die Registrierung eines neuen Benutzers
2. Prüfe die Bestätigungs-E-Mail
3. Der Link sollte korrekt funktionieren
4. Das Design sollte schön aussehen und die Kletterliga-Farben verwenden

## Hinweis zu Magic Links

Falls du Magic Links verwendest (E-Mail-Login ohne Passwort), gibt es auch ein Template für **Magic Link**. 
Das Template ist ähnlich, verwendet aber `{{ .ConfirmationURL }}` als Login-Link.
