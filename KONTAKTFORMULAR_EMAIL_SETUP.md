# E-Mails vom Kontaktformular an info@kletterliga-nrw.de (kostenlos)

**Aktuell:** Ohne konfigurierten API-Key werden Anfragen nur in der Datenbank gespeichert – **es wird keine E-Mail an info@ versendet**.

Es gibt zwei **kostenlose** Wege, damit das Formular E-Mails an euch schickt:

---

## Option 1: Resend (empfohlen) – 3.000 E-Mails/Monat kostenlos

Die bestehende Edge Function ist schon vorbereitet. Ihr müsst nur einen kostenlosen Resend-Account anlegen und den API-Key eintragen – **keine laufenden Kosten**.

### 1. Resend-Account und API-Key

1. Auf [resend.com](https://resend.com) registrieren (**kostenlos**, keine Kreditkarte nötig).
2. Unter **API Keys** einen neuen Key erstellen und kopieren.
3. Free Tier: **3.000 E-Mails pro Monat** kostenlos.

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

## Option 2: Formspree (ohne Supabase-Config)

Falls ihr **gar nichts** in Supabase konfigurieren wollt: Mit [Formspree](https://formspree.io) schickt das Formular die Daten direkt an Formspree, und sie leiten die E-Mails an euch weiter.

- **Kostenlos:** 50 Einsendungen/Monat im Free Tier.
- **Setup:** Account auf formspree.io, neues Formular anlegen, die angezeigte Form-URL (z. B. `https://formspree.io/f/xxxxx`) ins Projekt eintragen. Dafür müsste das Kontaktformular im Frontend so umgebaut werden, dass es per `POST` an diese URL sendet statt an die Supabase Edge Function.

Wenn ihr Option 2 nutzen wollt, kann das Formular entsprechend umgestellt werden (Submit-Ziel von Supabase auf Formspree).

---

**Hinweis:** Wenn `RESEND_API_KEY` nicht gesetzt ist, speichert die Edge Function die Nachrichten nur in der Tabelle `contact_requests`. Diese könnt ihr im Supabase Dashboard unter **Table Editor** → **contact_requests** einsehen.
