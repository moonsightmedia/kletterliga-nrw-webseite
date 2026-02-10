# E-Mails vom Kontaktformular an info@kletterliga-nrw.de

**Aktuell:** Ohne konfigurierten API-Key werden Anfragen nur in der Datenbank gespeichert – **es wird keine E-Mail an info@ versendet**.

Damit jede Kontaktanfrage als E-Mail bei **info@kletterliga-nrw.de** ankommt, musst du **Resend** einrichten und den API-Key in Supabase hinterlegen.

## Schritte

### 1. Resend-Account und API-Key

1. Auf [resend.com](https://resend.com) registrieren (kostenlos).
2. Unter **API Keys** einen neuen Key erstellen und kopieren.

### 2. Secrets in Supabase setzen

1. [Supabase Dashboard](https://supabase.com/dashboard) → dein Projekt.
2. **Project Settings** (Zahnrad) → **Edge Functions** → **Secrets** (oder direkt **Edge Functions** → **send-contact-email** → **Secrets**).
3. Folgende Secrets anlegen:
   - **Name:** `RESEND_API_KEY`  
     **Value:** dein Resend API Key
   - Optional, falls du andere Adressen nutzen willst:
     - `CONTACT_TO` = `info@kletterliga-nrw.de` (Standard)
     - `CONTACT_FROM` = z. B. `Kletterliga NRW <noreply@kletterliga-nrw.de>` (nur nach Domain-Verifizierung bei Resend; sonst z. B. `onboarding@resend.dev`)

### 3. Edge Function neu deployen

Nach dem Setzen der Secrets die Function einmal neu deployen, damit die neuen Umgebungsvariablen geladen werden:

```bash
supabase functions deploy send-contact-email
```

Danach werden alle neuen Kontaktanfragen per E-Mail an **info@kletterliga-nrw.de** (oder an den in `CONTACT_TO` eingetragenen Wert) gesendet.

---

**Hinweis:** Wenn `RESEND_API_KEY` nicht gesetzt ist, speichert die Function die Nachrichten nur in der Tabelle `contact_requests`. Diese kannst du im Supabase Dashboard unter **Table Editor** → **contact_requests** einsehen.
