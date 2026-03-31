# E-Mail-Setup mit Brevo

Diese App nutzt jetzt zwei Mail-Wege:

- `Supabase Auth` fuer Registrierungs-, Reset- und Invite-Mails per `Brevo SMTP`
- `send-contact-email` fuer das Kontaktformular per `Brevo API`

Ohne konfigurierte Mail-Credentials speichert das Kontaktformular Anfragen nur in `contact_requests`, und Supabase Auth bleibt auf dem eingebauten Test-SMTP mit sehr niedrigen Limits.

## 1. Brevo vorbereiten

1. Brevo-Account anlegen.
2. Eine Sender-Domain oder Subdomain verifizieren, zum Beispiel `mail.kletterliga-nrw.de`.
3. Zwei Credential-Typen erstellen:
   - `SMTP Key` fuer Supabase Auth
   - `API Key` fuer die Edge Function `send-contact-email`

## 2. Supabase Auth auf Brevo SMTP umstellen

Im Supabase Dashboard unter `Authentication -> Email -> SMTP Settings`:

- `Enable Custom SMTP`: aktivieren
- `Sender name`: `Kletterliga NRW`
- `Sender email`: `no-reply@mail.kletterliga-nrw.de`
- `Host`: `smtp-relay.brevo.com`
- `Port`: `587`
- `Username`: eure Brevo SMTP Login-Adresse
- `Password`: euer Brevo SMTP Key

Danach speichern und testweise ausloesen:

- Registrierung
- Passwort-Reset
- Gym-Invite

## 3. Kontaktformular auf Brevo stellen

Im Supabase-Projekt diese Secrets setzen:

- `BREVO_API_KEY` = euer Brevo API Key
- Optional: `CONTACT_TO` = `info@kletterliga-nrw.de`
- Optional: `CONTACT_FROM` = `Kletterliga NRW <kontakt@mail.kletterliga-nrw.de>`

Danach die Function neu deployen:

```bash
supabase functions deploy send-contact-email
```

## 4. Fallback-Verhalten

- Wenn `BREVO_API_KEY` gesetzt ist, versendet das Kontaktformular E-Mails ueber Brevo.
- Wenn nur `RESEND_API_KEY` gesetzt ist, nutzt das Formular weiter Resend.
- Wenn kein Mail-Key gesetzt ist, werden Anfragen nur in `contact_requests` gespeichert.

## 5. Wichtig vor dem Launch

- Testet mindestens einmal:
  - neues Konto anlegen
  - bestaetigungs-Mail erneut senden
  - Passwort zuruecksetzen
  - Gym-Invite verschicken
  - Kontaktformular absenden
- Prueft, ob die Mails im Spam landen.
- Wenn ihr mit Launch-Peaks rechnet, behaltet das Tageslimit von Brevo im Blick.
