# E-Mail-Template für Halle-Einladungen

## Problem

Supabase Auth verwendet standardmäßig die Site URL aus den Auth-Einstellungen für Einladungslinks. Wenn diese auf `localhost:3000` steht, werden alle Links auf localhost weitergeleitet.

## Lösung

### 1. Site URL in Supabase konfigurieren

1. Gehe zum [Supabase Dashboard](https://supabase.com/dashboard)
2. Wähle dein Projekt aus
3. Navigiere zu **Project Settings** → **Auth** → **URL Configuration**
4. Setze die **Site URL** auf: `https://kletterliga-nrw.de`
5. Füge zu **Redirect URLs** hinzu:
   - `https://kletterliga-nrw.de/app/invite/gym/*`
   - `https://kletterliga-nrw.de/**` (für alle anderen Redirects)

### 2. E-Mail-Template anpassen

Das E-Mail-Template muss angepasst werden, um unseren custom Link mit dem Token zu verwenden:

1. Gehe zu **Authentication** → **Email Templates** → **Invite user**
2. Ersetze das Template mit folgendem:

```html
<h2>Einladung zur Halle-Registrierung</h2>
<p>Hallo,</p>
<p>du wurdest eingeladen, eine Halle für die Kletterliga NRW zu registrieren.</p>
<p>Klicke auf den folgenden Link, um deine Halle zu erstellen:</p>
<p><a href="{{ .Data.invite_url }}">Halle registrieren</a></p>
<p>Alternativ kannst du diesen Link verwenden:</p>
<p><a href="{{ .ConfirmationURL }}">Einladung bestätigen</a></p>
<p><strong>Wichtig:</strong> Dieser Link ist 7 Tage gültig.</p>
<p>Falls du diese Einladung nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
<p>Viele Grüße,<br>Das Team der Kletterliga NRW</p>
```

**Wichtig:** 
- `{{ .Data.invite_url }}` enthält unseren custom Link mit dem Token
- `{{ .ConfirmationURL }}` ist der Standard-Supabase-Link (falls der custom Link nicht funktioniert)

### 3. Template-Variablen

Im E-Mail-Template stehen folgende Variablen zur Verfügung:

- `{{ .Data.invite_url }}` - Unser custom Link: `https://kletterliga-nrw.de/app/invite/gym/[token]`
- `{{ .Data.token }}` - Der Einladungs-Token
- `{{ .ConfirmationURL }}` - Standard Supabase Bestätigungs-URL
- `{{ .Email }}` - Die E-Mail-Adresse des Empfängers
- `{{ .Token }}` - Der Supabase Auth Token (nicht unser custom Token)

### 4. Alternative: Nur custom Link verwenden

Falls du nur unseren custom Link verwenden möchtest:

```html
<h2>Einladung zur Halle-Registrierung</h2>
<p>Hallo,</p>
<p>du wurdest eingeladen, eine Halle für die Kletterliga NRW zu registrieren.</p>
<p>Klicke auf den folgenden Link, um deine Halle zu erstellen:</p>
<p><a href="{{ .Data.invite_url }}" style="display: inline-block; padding: 12px 24px; background-color: #003D55; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Halle registrieren</a></p>
<p>Oder kopiere diesen Link in deinen Browser:</p>
<p style="word-break: break-all;">{{ .Data.invite_url }}</p>
<p><strong>Wichtig:</strong> Dieser Link ist 7 Tage gültig.</p>
<p>Falls du diese Einladung nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
<p>Viele Grüße,<br>Das Team der Kletterliga NRW</p>
```

## Testing

Nach der Konfiguration:

1. **Site URL prüfen**: Stelle sicher, dass die Site URL auf `https://kletterliga-nrw.de` steht
2. **Redirect URLs prüfen**: Stelle sicher, dass `https://kletterliga-nrw.de/app/invite/gym/*` hinzugefügt wurde
3. **E-Mail-Template speichern**: Speichere das angepasste Template
4. **Test-Einladung senden**: Versuche, eine Halle einzuladen
5. **E-Mail prüfen**: Öffne die E-Mail und prüfe, ob der Link korrekt ist

## Troubleshooting

### Problem: Link zeigt immer noch auf localhost

- ✅ Prüfe die **Site URL** in den Auth-Einstellungen
- ✅ Prüfe die **Redirect URLs** - die URL muss exakt passen
- ✅ Stelle sicher, dass das E-Mail-Template `{{ .Data.invite_url }}` verwendet
- ✅ Prüfe die Supabase Logs auf Fehler

### Problem: Link funktioniert nicht

- ✅ Stelle sicher, dass die Route `/app/invite/gym/:token` in deiner App existiert
- ✅ Prüfe, ob der Token korrekt übertragen wird
- ✅ Prüfe die Browser-Konsole auf Fehler

### Problem: Template-Variablen werden nicht ersetzt

- ✅ Stelle sicher, dass die Variablen korrekt geschrieben sind: `{{ .Data.invite_url }}`
- ✅ Prüfe, ob die Daten in der Edge Function korrekt übergeben werden
- ✅ Prüfe die Supabase Logs
