# SMTP-Konfiguration Schritt-für-Schritt Anleitung

Diese Anleitung zeigt dir genau, was du in die Supabase SMTP-Konfiguration eintragen musst und woher du die Informationen bekommst.

## Schritt 1: E-Mail-Anbieter auswählen

Für die Kletterliga NRW empfehle ich einen der folgenden Anbieter:

### Option A: Resend (Empfohlen - einfach & kostenlos)
- ✅ Kostenlos bis 3.000 E-Mails/Monat
- ✅ Sehr einfache Einrichtung
- ✅ Gute Developer Experience
- ✅ Deutsche Domain möglich

### Option B: SendGrid
- ✅ Kostenlos bis 100 E-Mails/Tag
- ✅ Sehr zuverlässig
- ✅ Gute Dokumentation

### Option C: Mailgun
- ✅ Kostenlos bis 5.000 E-Mails/Monat (für 3 Monate, dann Pay-as-you-go)
- ✅ Sehr zuverlässig

### Option D: Eigener E-Mail-Server (z.B. von deinem Hosting)
- Falls du bereits Webhosting hast (z.B. Strato, 1&1, IONOS), kannst du deren E-Mail-Server nutzen

---

## Schritt 2: Anbieter-spezifische Konfiguration

### 🔵 Option A: Resend (Empfohlen)

#### 1. Account erstellen
1. Gehe zu [resend.com](https://resend.com)
2. Erstelle einen kostenlosen Account
3. Verifiziere deine E-Mail-Adresse

#### 2. API Key erstellen
1. Nach dem Login: **API Keys** → **Create API Key**
2. Gib einen Namen ein (z.B. "Supabase SMTP")
3. Kopiere den API Key (wird nur einmal angezeigt!)

#### 3. Domain verifizieren (optional, aber empfohlen)
1. Gehe zu **Domains** → **Add Domain**
2. Gib deine Domain ein: `kletterliga-nrw.de`
3. Folge den DNS-Anweisungen (TXT-Records für SPF/DKIM)
4. Warte auf Verifizierung (kann einige Minuten dauern)

#### 4. In Supabase eintragen:
```
Sender email address: noreply@kletterliga-nrw.de
                    (oder: noreply@resend.dev für Testing ohne Domain)

Sender name: Kletterliga NRW

Host: smtp.resend.com

Port number: 465

Username: resend

Password: [dein-resend-api-key] (der API Key, den du in Schritt 2 erstellt hast)
```

---

### 🟢 Option B: SendGrid

#### 1. Account erstellen
1. Gehe zu [sendgrid.com](https://sendgrid.com)
2. Erstelle einen kostenlosen Account
3. Verifiziere deine E-Mail-Adresse

#### 2. API Key erstellen
1. Nach dem Login: **Settings** → **API Keys** → **Create API Key**
2. Wähle "Full Access" oder "Mail Send" Berechtigung
3. Gib einen Namen ein (z.B. "Supabase SMTP")
4. Kopiere den API Key (wird nur einmal angezeigt!)

#### 3. Sender verifizieren
1. Gehe zu **Settings** → **Sender Authentication**
2. Verifiziere entweder:
   - **Single Sender Verification**: Eine einzelne E-Mail-Adresse
   - **Domain Authentication**: Deine gesamte Domain (empfohlen)

#### 4. In Supabase eintragen:
```
Sender email address: noreply@kletterliga-nrw.de
                    (muss verifiziert sein!)

Sender name: Kletterliga NRW

Host: smtp.sendgrid.net

Port number: 587

Username: apikey

Password: [dein-sendgrid-api-key] (der API Key, den du in Schritt 2 erstellt hast)
```

---

### 🟡 Option C: Mailgun

#### 1. Account erstellen
1. Gehe zu [mailgun.com](https://mailgun.com)
2. Erstelle einen kostenlosen Account
3. Verifiziere deine E-Mail-Adresse

#### 2. Domain hinzufügen
1. Nach dem Login: **Sending** → **Domains** → **Add New Domain**
2. Gib deine Domain ein: `kletterliga-nrw.de`
3. Folge den DNS-Anweisungen
4. Warte auf Verifizierung

#### 3. SMTP Credentials finden
1. Gehe zu **Sending** → **Domain Settings** → **SMTP credentials**
2. Notiere dir:
   - **SMTP hostname**
   - **Default SMTP login**
   - **Default password**

#### 4. In Supabase eintragen:
```
Sender email address: noreply@kletterliga-nrw.de

Sender name: Kletterliga NRW

Host: [smtp-hostname aus Mailgun] (z.B. smtp.mailgun.org)

Port number: 587

Username: [default-smtp-login aus Mailgun]

Password: [default-password aus Mailgun]
```

---

### 🟠 Option D: Eigener E-Mail-Server (z.B. Strato, 1&1, IONOS)

Falls du bereits Webhosting hast, kannst du deren E-Mail-Server nutzen:

#### 1. E-Mail-Adresse erstellen
1. Logge dich in dein Hosting-Panel ein
2. Erstelle eine neue E-Mail-Adresse: `noreply@kletterliga-nrw.de`
3. Setze ein Passwort

#### 2. SMTP-Einstellungen finden
Die SMTP-Einstellungen findest du normalerweise in deinem Hosting-Panel unter:
- **E-Mail** → **E-Mail-Einstellungen**
- **E-Mail** → **SMTP-Konfiguration**
- Oder in der Dokumentation deines Hosters

#### 3. Typische Werte für deutsche Hoster:

**Strato:**
```
Host: smtp.strato.de
Port: 587
Username: [deine-vollständige-email@kletterliga-nrw.de]
Password: [dein-email-passwort]
```

**1&1 IONOS:**
```
Host: smtp.ionos.de
Port: 587
Username: [deine-vollständige-email@kletterliga-nrw.de]
Password: [dein-email-passwort]
```

**All-inkl:**
```
Host: smtp.all-inkl.com
Port: 587
Username: [deine-vollständige-email@kletterliga-nrw.de]
Password: [dein-email-passwort]
```

#### 4. In Supabase eintragen:
```
Sender email address: noreply@kletterliga-nrw.de

Sender name: Kletterliga NRW

Host: [smtp-hostname von deinem Hoster]

Port number: 587 (oder 465)

Username: [deine-vollständige-email@kletterliga-nrw.de]

Password: [dein-email-passwort]
```

---

## Schritt 3: In Supabase eintragen

1. Gehe zum [Supabase Dashboard](https://supabase.com/dashboard)
2. Wähle dein Projekt aus
3. Navigiere zu **Project Settings** → **Auth** → **SMTP Settings**
4. Fülle alle Felder aus (siehe Beispiele oben)
5. Aktiviere den Toggle **"Enable custom SMTP"** (oben rechts)
6. Klicke auf **"Save changes"** (unten rechts)

---

## Schritt 4: Testen

Nach dem Speichern solltest du:

1. **Eine Test-Einladung senden:**
   - Gehe zu deiner App
   - Versuche, eine Halle einzuladen
   - Prüfe, ob die E-Mail ankommt
   - Prüfe auch den Spam-Ordner!

2. **Eine Test-Registrierung durchführen:**
   - Registriere einen neuen Teilnehmer
   - Prüfe, ob die Bestätigungsmail ankommt

---

## Häufige Probleme & Lösungen

### Problem: E-Mails kommen nicht an
- ✅ Prüfe den Spam-Ordner
- ✅ Prüfe die Supabase Logs: **Dashboard** → **Logs** → **Auth Logs**
- ✅ Stelle sicher, dass alle Felder ausgefüllt sind
- ✅ Prüfe, ob der Toggle aktiviert ist

### Problem: "Authentication failed"
- ✅ Prüfe Username und Password (API Key)
- ✅ Bei SendGrid: Stelle sicher, dass der Username `apikey` ist (nicht deine E-Mail!)
- ✅ Bei Resend: Stelle sicher, dass der Username `resend` ist

### Problem: "Connection timeout"
- ✅ Prüfe die Port-Nummer (587 oder 465)
- ✅ Prüfe den Hostnamen (keine Tippfehler!)
- ✅ Prüfe deine Firewall-Einstellungen

### Problem: E-Mails landen im Spam
- ✅ Verifiziere deine Domain (SPF/DKIM/DMARC)
- ✅ Nutze eine verifizierte Domain statt einer Test-Domain
- ✅ Stelle sicher, dass der "Sender name" professionell ist

---

## Empfehlung für Kletterliga NRW

Ich empfehle **Resend**, weil:
- ✅ Sehr einfach einzurichten
- ✅ Kostenlos für deine Anforderungen (3.000 E-Mails/Monat reichen locker)
- ✅ Gute Developer Experience
- ✅ Schnelle Einrichtung

**Schnellstart mit Resend:**
1. Account bei resend.com erstellen (2 Minuten)
2. API Key erstellen (1 Minute)
3. In Supabase eintragen (siehe oben)
4. Fertig! 🎉

---

## Wichtige Sicherheitshinweise

- 🔒 **API Keys sind geheim**: Teile sie niemals öffentlich
- 🔒 **Passwörter**: Verwende starke Passwörter für E-Mail-Accounts
- 🔒 **Domain-Verifizierung**: Verifiziere deine Domain für bessere Zustellbarkeit
- 🔒 **Rate Limits**: Beachte die Limits deines Anbieters

---

## Nächste Schritte

Nach der SMTP-Konfiguration:
1. ✅ Setze die `FRONTEND_URL` Umgebungsvariable für die Edge Function (siehe `EMAIL_KONFIGURATION.md`)
2. ✅ Passe die E-Mail-Templates an (optional, aber empfohlen)
3. ✅ Teste beide E-Mail-Funktionen (Halle-Einladung & Registrierung)
