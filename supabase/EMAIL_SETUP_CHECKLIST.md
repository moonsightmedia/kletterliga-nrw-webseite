# ✅ E-Mail-Setup Checkliste

Diese Checkliste hilft dir dabei, sicherzustellen, dass alle E-Mails korrekt funktionieren.

## 📋 Code-Änderungen (bereits erledigt ✅)

- [x] Passwort-Reset-Seite erstellt (`/app/auth/reset-password`)
- [x] `resetPasswordForEmail` mit `redirectTo` konfiguriert
- [x] `signUp` mit `emailRedirectTo` konfiguriert
- [x] `inviteUserByEmail` mit `redirectTo` konfiguriert
- [x] EmailConfirm-Komponente für Magic Link erweitert
- [x] Alle Templates dokumentiert

## 🔧 Supabase Dashboard Konfiguration (MUSS NOCH GEMACHT WERDEN)

### 1. Site URL und Redirect URLs konfigurieren

**Wo:** Supabase Dashboard → Project Settings → Auth → URL Configuration

**Site URL:**
```
https://kletterliga-nrw.de
```

**Redirect URLs hinzufügen:**
```
https://kletterliga-nrw.de/app/auth/confirm
https://kletterliga-nrw.de/app/auth/reset-password
https://kletterliga-nrw.de/app/invite/gym/*
https://kletterliga-nrw.de/**
http://localhost:8081/app/auth/confirm
http://localhost:8081/app/auth/reset-password
http://localhost:8081/app/invite/gym/*
http://localhost:8081/**
```

### 2. E-Mail-Templates einfügen

**Wo:** Supabase Dashboard → Authentication → Email Templates

Füge die Templates aus `supabase/EMAIL_TEMPLATES_KOMPLETT.md` ein:

- [ ] **Invite user** - Kopiere Template aus Abschnitt "1️⃣ TEMPLATE: Invite user"
- [ ] **Confirm signup** - Kopiere Template aus Abschnitt "2️⃣ TEMPLATE: Confirm signup"
- [ ] **Reset Password** - Kopiere Template aus Abschnitt "3️⃣ TEMPLATE: Reset Password"
- [ ] **Magic Link** - Kopiere Template aus Abschnitt "4️⃣ TEMPLATE: Magic Link" (optional)

### 3. SMTP konfigurieren (für Produktion)

**Wo:** Supabase Dashboard → Project Settings → Auth → SMTP Settings

Für die Produktion solltest du einen eigenen SMTP-Server konfigurieren:

- [ ] **Enable Custom SMTP** aktivieren
- [ ] SMTP-Daten eintragen (siehe `supabase/SMTP_SETUP_ANLEITUNG.md`)

**Empfohlene Anbieter:**
- Resend (kostenlos bis 3.000 E-Mails/Monat)
- SendGrid (kostenlos bis 100 E-Mails/Tag)
- Mailgun (kostenlos bis 5.000 E-Mails/Monat)

## 🧪 Testing

Nach der Konfiguration teste alle E-Mail-Typen:

- [ ] **Invite user**: Sende eine Test-Einladung für eine Halle
  - Prüfe, ob die E-Mail ankommt
  - Prüfe, ob der Link auf `kletterliga-nrw.de/app/invite/gym/[token]` zeigt
  - Prüfe, ob der Link funktioniert

- [ ] **Confirm signup**: Registriere einen neuen Benutzer
  - Prüfe, ob die E-Mail ankommt
  - Prüfe, ob der Link auf `kletterliga-nrw.de/app/auth/confirm` zeigt
  - Prüfe, ob die Bestätigung funktioniert

- [ ] **Reset Password**: Teste die Passwort-Reset-Funktion
  - Gehe zu Profil → Passwort ändern
  - Prüfe, ob die E-Mail ankommt
  - Prüfe, ob der Link auf `kletterliga-nrw.de/app/auth/reset-password` zeigt
  - Prüfe, ob das Zurücksetzen funktioniert

- [ ] **Magic Link**: Teste passwortlosen Login (falls aktiviert)
  - Prüfe, ob die E-Mail ankommt
  - Prüfe, ob der Link auf `kletterliga-nrw.de/app/auth/confirm` zeigt
  - Prüfe, ob der Login funktioniert

## ✅ Erfolgskriterien

Alle E-Mails funktionieren korrekt, wenn:

1. ✅ E-Mails werden versendet (nicht im Spam-Ordner)
2. ✅ Links zeigen auf die eigene Domain (`kletterliga-nrw.de`)
3. ✅ Links funktionieren und leiten korrekt weiter
4. ✅ E-Mail-Provider markieren Links nicht als "unsicher"
5. ✅ Alle Templates haben das korrekte Design

## 🐛 Troubleshooting

### Problem: E-Mails kommen nicht an

**Lösung:**
- Prüfe, ob SMTP konfiguriert ist (für Produktion)
- Prüfe Spam-Ordner
- Prüfe Supabase Logs (Dashboard → Logs)

### Problem: Links zeigen auf Supabase-Domain

**Lösung:**
- Prüfe Site URL in Supabase Dashboard
- Prüfe, ob Redirect URLs korrekt eingetragen sind
- Prüfe, ob Templates `{{ .ConfirmationURL }}` verwenden

### Problem: Links funktionieren nicht

**Lösung:**
- Prüfe, ob Redirect URLs in Supabase eingetragen sind
- Prüfe, ob die Routes im Frontend existieren
- Prüfe Browser-Konsole auf Fehler

### Problem: E-Mail-Provider markiert Links als unsicher

**Lösung:**
- Stelle sicher, dass Links auf `kletterliga-nrw.de` zeigen
- Stelle sicher, dass HTTPS verwendet wird
- Prüfe, ob die Domain korrekt konfiguriert ist

## 📚 Weitere Informationen

- Vollständige Templates: `supabase/EMAIL_TEMPLATES_KOMPLETT.md`
- SMTP Setup: `supabase/SMTP_SETUP_ANLEITUNG.md`
- E-Mail-Konfiguration: `supabase/EMAIL_KONFIGURATION.md`
