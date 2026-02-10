# Send Contact Email (Kontaktformular)

**Damit E-Mails an info@ ankommen:** `RESEND_API_KEY` in den Supabase Edge Function Secrets setzen (siehe Projektroot: `KONTAKTFORMULAR_EMAIL_SETUP.md`). Ohne diesen Key wird **keine Mail versendet**, nur in `contact_requests` gespeichert.

Diese Edge Function verarbeitet das Kontaktformular **ohne zwingend ein externes Tool**:

- **Mit Resend:** Wenn `RESEND_API_KEY` gesetzt ist, wird die Nachricht per E-Mail an euch versendet.
- **Ohne Resend:** Wenn kein API Key gesetzt ist, wird die Nachricht in der Supabase-Tabelle **`contact_requests`** gespeichert. Ihr könnt die Anfragen im Supabase Dashboard unter **Table Editor** → **contact_requests** einsehen und dort z. B. per E-Mail antworten.

## Ohne externes Tool (nur Supabase)

1. Migration ausführen (falls noch nicht geschehen): `supabase db push` bzw. Migration `20250210170000_contact_requests.sql`.
2. Function deployen: `supabase functions deploy send-contact-email`
3. Nachrichten erscheinen im **Table Editor** unter **contact_requests** (id, name, email, subject, message, created_at).

## Mit E-Mail-Versand (Resend, optional)

1. **Resend-Account:** Auf [resend.com](https://resend.com) registrieren und API Key erstellen.
2. **Domain (optional):** Für Absender wie `noreply@kletterliga-nrw.de` die Domain bei Resend verifizieren.
3. **Supabase Secrets:** Im Dashboard unter **Edge Functions** → **Secrets** eintragen:
   - `RESEND_API_KEY` = dein Resend API Key
   - Optional: `CONTACT_TO`, `CONTACT_FROM`
4. Function erneut deployen.

Wenn `RESEND_API_KEY` gesetzt ist, werden E-Mails versendet; andernfalls werden die Nachrichten nur in `contact_requests` gespeichert.
