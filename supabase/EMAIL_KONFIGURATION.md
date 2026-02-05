# E-Mail-Konfiguration für Supabase

Dieses Projekt verwendet Supabase Auth für E-Mail-Versand:
- **Halle-Einladungen**: Werden über `supabase.auth.admin.inviteUserByEmail()` versendet
- **Teilnehmer-Registrierung**: Bestätigungsmails werden über `supabase.auth.signUp()` versendet

## Problem

Standardmäßig versendet Supabase keine E-Mails, wenn keine E-Mail-Konfiguration eingerichtet ist. Dies betrifft sowohl die lokale Entwicklung als auch die Produktion.

## Lösung: E-Mail-Konfiguration in Supabase Dashboard

### Option 1: Supabase Standard E-Mail-Service (für Entwicklung/Testing)

1. Gehe zum [Supabase Dashboard](https://supabase.com/dashboard)
2. Wähle dein Projekt aus
3. Navigiere zu **Authentication** → **Email Templates**
4. Hier kannst du die Standard-Templates anpassen

**Wichtig**: In der lokalen Entwicklung werden E-Mails standardmäßig nicht versendet. Du kannst sie aber in den Logs sehen:
- Lokal: `supabase logs` oder in der Supabase CLI Ausgabe
- Produktion: Supabase Dashboard → Logs

### Option 2: Eigener SMTP-Server (für Produktion empfohlen)

Für die Produktion solltest du einen eigenen SMTP-Server konfigurieren:

1. Gehe zum [Supabase Dashboard](https://supabase.com/dashboard)
2. Wähle dein Projekt aus
3. Navigiere zu **Project Settings** → **Auth** → **SMTP Settings**
4. Aktiviere **Enable Custom SMTP**
5. Konfiguriere deine SMTP-Einstellungen:

   **Empfohlene Anbieter:**
   - **SendGrid**: Kostenlos bis 100 E-Mails/Tag
   - **Resend**: Kostenlos bis 3.000 E-Mails/Monat
   - **Mailgun**: Kostenlos bis 5.000 E-Mails/Monat
   - **Amazon SES**: Sehr günstig, Pay-as-you-go
   - **Postmark**: Für Transaktions-E-Mails optimiert

   **Beispiel-Konfiguration für SendGrid:**
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey
   SMTP Password: [dein-sendgrid-api-key]
   Sender Email: noreply@deine-domain.de
   Sender Name: Kletterliga NRW
   ```

6. **E-Mail-Templates anpassen** (optional):
   - Gehe zu **Authentication** → **Email Templates**
   - Passe die Templates für deine Anwendung an:
     - **Invite user**: Für Halle-Einladungen
     - **Confirm signup**: Für Teilnehmer-Registrierung

### Option 3: Resend (Empfohlen für moderne Apps)

Resend ist sehr einfach zu integrieren und bietet eine gute Developer Experience:

1. Erstelle einen Account bei [Resend](https://resend.com)
2. Erstelle einen API Key
3. Verifiziere deine Domain (optional, aber empfohlen)
4. In Supabase Dashboard:
   - **Project Settings** → **Auth** → **SMTP Settings**
   - **Enable Custom SMTP**: Aktivieren
   - **SMTP Host**: `smtp.resend.com`
   - **SMTP Port**: `465` (SSL) oder `587` (TLS)
   - **SMTP User**: `resend`
   - **SMTP Password**: `[dein-resend-api-key]`
   - **Sender Email**: `noreply@deine-verifizierte-domain.com`
   - **Sender Name**: `Kletterliga NRW`

## E-Mail-Templates anpassen

Nach der SMTP-Konfiguration solltest du die E-Mail-Templates anpassen:

### Template für Halle-Einladung (Invite user)

1. Gehe zu **Authentication** → **Email Templates** → **Invite user**
2. Passe das Template an:

```html
<h2>Einladung zur Halle-Registrierung</h2>
<p>Du wurdest eingeladen, eine Halle für die Kletterliga NRW zu registrieren.</p>
<p>Klicke auf den folgenden Link, um deine Halle zu erstellen:</p>
<p><a href="{{ .ConfirmationURL }}">Halle registrieren</a></p>
<p>Dieser Link ist 7 Tage gültig.</p>
```

### Template für Teilnehmer-Registrierung (Confirm signup)

1. Gehe zu **Authentication** → **Email Templates** → **Confirm signup**
2. Passe das Template an:

```html
<h2>Willkommen bei der Kletterliga NRW!</h2>
<p>Vielen Dank für deine Registrierung.</p>
<p>Bitte bestätige deine E-Mail-Adresse, indem du auf den folgenden Link klickst:</p>
<p><a href="{{ .ConfirmationURL }}">E-Mail-Adresse bestätigen</a></p>
<p>Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.</p>
```

## Testing

### Lokale Entwicklung

In der lokalen Entwicklung werden E-Mails standardmäßig nicht versendet. Du kannst:

1. Die E-Mail-Links in den Supabase Logs finden:
   ```bash
   npx supabase logs
   ```

2. Oder die E-Mail-Bestätigung temporär deaktivieren:
   - In `supabase/config.toml` (falls vorhanden) oder im Dashboard
   - **Authentication** → **Settings** → **Email Auth** → **Enable email confirmations**: Deaktivieren (nur für Entwicklung!)

### Produktion

1. Teste die Halle-Einladung:
   - Als Liga-Admin eine Halle einladen
   - Prüfe, ob die E-Mail ankommt
   - Prüfe den Spam-Ordner, falls die E-Mail nicht ankommt

2. Teste die Teilnehmer-Registrierung:
   - Registriere einen neuen Teilnehmer
   - Prüfe, ob die Bestätigungsmail ankommt
   - Prüfe den Spam-Ordner

## Troubleshooting

### E-Mails kommen nicht an

1. **SMTP-Konfiguration prüfen**:
   - Sind die SMTP-Einstellungen korrekt?
   - Ist der API Key gültig?
   - Ist die Domain verifiziert (falls erforderlich)?

2. **Spam-Ordner prüfen**:
   - E-Mails landen oft im Spam-Ordner
   - Prüfe auch den Junk-Ordner

3. **Supabase Logs prüfen**:
   - Dashboard → Logs → Auth Logs
   - Suche nach Fehlermeldungen beim E-Mail-Versand

4. **Rate Limits prüfen**:
   - Manche E-Mail-Anbieter haben Rate Limits
   - Prüfe, ob du das Limit überschritten hast

5. **E-Mail-Templates prüfen**:
   - Sind die Templates korrekt konfiguriert?
   - Enthalten sie die richtigen Variablen (`{{ .ConfirmationURL }}`)?

### E-Mail-Links funktionieren nicht

1. **Redirect-URL prüfen**:
   - In `invite-gym-admin/index.ts` wird `redirectTo: inviteUrl` gesetzt
   - Stelle sicher, dass die URL korrekt ist
   - Die URL sollte die vollständige Domain enthalten (nicht nur `/app/invite/gym/...`)

2. **Site URL prüfen**:
   - Dashboard → **Project Settings** → **Auth** → **URL Configuration**
   - Stelle sicher, dass die **Site URL** korrekt ist
   - Füge alle Redirect-URLs zu **Redirect URLs** hinzu

## Umgebungsvariablen für Edge Functions

Die `invite-gym-admin` Funktion benötigt die Frontend-URL für die Einladungslinks:

1. Gehe zum [Supabase Dashboard](https://supabase.com/dashboard)
2. Wähle dein Projekt aus
3. Navigiere zu **Edge Functions** → **invite-gym-admin** → **Settings**
4. Füge eine neue Umgebungsvariable hinzu:
   - **Name**: `FRONTEND_URL`
   - **Value**: `https://kletterliga-nrw.de` (oder deine tatsächliche Frontend-URL)
5. Speichere die Änderungen

**Alternative**: Du kannst auch `SITE_URL` verwenden (wird automatisch erkannt).

**Wichtig**: Nach dem Hinzufügen der Umgebungsvariable musst du die Edge Function neu deployen:
```bash
npx supabase functions deploy invite-gym-admin
```

## Wichtige Hinweise

- ⚠️ **Lokale Entwicklung**: E-Mails werden standardmäßig nicht versendet. Nutze die Logs oder deaktiviere temporär die E-Mail-Bestätigung.
- ✅ **Produktion**: Konfiguriere immer einen eigenen SMTP-Server für zuverlässigen E-Mail-Versand.
- 🔒 **Sicherheit**: Verwende niemals deine persönliche E-Mail-Adresse als Sender. Nutze eine Domain und verifiziere sie.
- 📧 **Spam**: Stelle sicher, dass deine Domain SPF/DKIM/DMARC konfiguriert ist, um Spam zu vermeiden.
- 🔗 **Frontend-URL**: Stelle sicher, dass die `FRONTEND_URL` Umgebungsvariable in der Edge Function gesetzt ist, damit die Einladungslinks korrekt funktionieren.
