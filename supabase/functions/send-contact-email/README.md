# Send Contact Email (Kontaktformular)

Diese Edge Function versendet Kontaktanfragen bevorzugt ueber `Brevo` und faellt optional auf `Resend` zurueck.

## Verhalten

- Mit `BREVO_API_KEY`: Versand ueber Brevo
- Nur mit `RESEND_API_KEY`: Versand ueber Resend
- Ohne Mail-Key: Speichern in `contact_requests`, aber kein E-Mail-Versand

## Konfiguration

Secrets im Supabase-Projekt:

- `BREVO_API_KEY`
- optional `RESEND_API_KEY`
- optional `CONTACT_TO`
- optional `CONTACT_FROM`

Empfohlene Werte:

- `CONTACT_TO=info@kletterliga-nrw.de`
- `CONTACT_FROM=Kletterliga NRW <kontakt@mail.kletterliga-nrw.de>`

## Deploy

```bash
supabase functions deploy send-contact-email
```

## Hinweis

Die Auth-Mails der App laufen separat ueber `Supabase Auth -> SMTP Settings`. Dafuer wird ein `Brevo SMTP Key` benoetigt, nicht der `BREVO_API_KEY`.
