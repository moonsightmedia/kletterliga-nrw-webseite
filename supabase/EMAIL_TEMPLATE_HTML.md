# E-Mail-Template für Halle-Einladungen

## WICHTIG: Dieses Template muss in Supabase eingefügt werden!

Gehe zu: **Authentication** → **Email Templates** → **Invite user**

Kopiere den gesamten HTML-Code unten und füge ihn in das Template ein.

## HTML-Template (schön gestaltet)

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
              
              <!-- Alternative Link -->
              <p style="margin: 30px 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
              </p>
              <p style="margin: 0 0 30px; padding: 12px; background-color: #f5f5f5; border-radius: 6px; word-break: break-all; color: #003D55; font-size: 14px; font-family: monospace;">
                {{ .Data.invite_url }}
              </p>
              
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

## Einfacheres Template (falls HTML-Probleme)

Falls das HTML-Template Probleme macht, hier eine einfachere Version:

```html
<h2 style="color: #003D55; font-size: 24px; margin-bottom: 20px;">Einladung zur Halle-Registrierung</h2>

<p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
  Hallo,
</p>

<p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
  du wurdest eingeladen, eine Halle für die <strong>Kletterliga NRW</strong> zu registrieren. 
  Erstelle jetzt dein Hallen-Profil und werde Teil unserer Liga!
</p>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{ .Data.invite_url }}" style="display: inline-block; padding: 16px 32px; background-color: #003D55; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
    Halle jetzt registrieren
  </a>
</div>

<p style="font-size: 14px; color: #666666; margin-top: 30px;">
  Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
  <span style="word-break: break-all; color: #003D55;">{{ .Data.invite_url }}</span>
</p>

<div style="margin: 30px 0; padding: 16px; background-color: #f0f9ff; border-left: 4px solid #003D55;">
  <p style="margin: 0; color: #003D55; font-size: 14px;">
    <strong>⏰ Wichtig:</strong> Dieser Link ist <strong>7 Tage</strong> gültig.
  </p>
</div>

<p style="font-size: 14px; color: #666666; margin-top: 30px;">
  Falls du diese Einladung nicht angefordert hast, kannst du diese E-Mail ignorieren.
</p>

<p style="margin-top: 40px; font-size: 12px; color: #999999; text-align: center;">
  Kletterliga NRW - Der landesweite Hallenkletter-Wettkampf in Nordrhein-Westfalen
</p>
```

## WICHTIG: Template-Variablen

Das Template verwendet:
- `{{ .Data.invite_url }}` - Der korrekte Link: `https://kletterliga-nrw.de/app/invite/gym/[token]`
- `{{ .Data.token }}` - Der Token (falls benötigt)
- `{{ .Email }}` - Die E-Mail-Adresse des Empfängers

## Anleitung zum Einfügen

1. Gehe zum [Supabase Dashboard](https://supabase.com/dashboard)
2. Wähle dein Projekt aus
3. Navigiere zu **Authentication** → **Email Templates**
4. Wähle **Invite user** aus
5. Kopiere eines der Templates oben
6. Füge es in das Template-Feld ein
7. Klicke auf **Save**

## Prüfen nach dem Speichern

Nach dem Speichern:
1. Sende eine Test-Einladung
2. Prüfe die E-Mail
3. Der Link sollte auf `https://kletterliga-nrw.de/app/invite/gym/[token]` zeigen (ohne doppelte Slashes)
4. Das Design sollte schön aussehen
