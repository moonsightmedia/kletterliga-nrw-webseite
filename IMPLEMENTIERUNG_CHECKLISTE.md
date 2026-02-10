# ✅ Implementierung Checkliste: Kostenlose Custom Domain Lösung

## Was wurde bereits gemacht ✅

- [x] **Vercel Serverless Function erstellt** (`api/auth/verify.ts`)
  - Leitet Auth-Verifizierungsanfragen an Supabase weiter
  - Zeigt auf unsere Domain: `https://kletterliga-nrw.de/api/auth/verify`

- [x] **Vercel-Konfiguration angepasst** (`vercel.json`)
  - API-Routen werden korrekt geroutet

- [x] **E-Mail-Templates aktualisiert** (`supabase/EMAIL_TEMPLATES_KOMPLETT.md`)
  - Alle Templates verwenden jetzt die Proxy-Links
  - Links zeigen auf unsere Domain statt auf Supabase

- [x] **Dokumentation erstellt**
  - Vollständige Anleitung: `supabase/KOSTENLOSE_CUSTOM_DOMAIN_LÖSUNG.md`
  - Schnellstart: `KOSTENLOSE_LÖSUNG_ZUSAMMENFASSUNG.md`
  - Unterschiede erklärt: `UNTERSCHIEDE_ERKLÄRT.md`

---

## Was DU noch machen musst 🔧

### Schritt 1: Code deployen

```bash
git add api/auth/verify.ts vercel.json
git commit -m "Add free custom domain solution for auth links"
git push
```

Vercel deployt automatisch nach dem Push.

### Schritt 2: Environment-Variable prüfen

**Wo:** Vercel Dashboard → Dein Projekt → Settings → Environment Variables

**Stelle sicher, dass gesetzt ist:**
- `VITE_SUPABASE_URL` = `https://ssxuurccefxfhxucgepo.supabase.co`
- ODER `SUPABASE_URL` = `https://ssxuurccefxfhxucgepo.supabase.co`

**Falls nicht vorhanden:** Füge eine der beiden Variablen hinzu.

### Schritt 3: E-Mail-Templates in Supabase aktualisieren

**WICHTIG:** Du musst die Templates im Supabase Dashboard manuell ändern!

#### 3.1 Confirm signup Template

1. Gehe zu: **Supabase Dashboard** → **Authentication** → **Email Templates** → **Confirm signup**
2. Öffne `supabase/EMAIL_TEMPLATES_KOMPLETT.md` (Abschnitt "2️⃣ TEMPLATE: Confirm signup")
3. Kopiere das **komplette HTML-Template** (ab Zeile 140)
4. Füge es in das Supabase Template-Feld ein
5. Klicke auf **Save**

**Wichtig:** Das Template verwendet jetzt:
- `https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=signup&redirect_to=https://kletterliga-nrw.de/app/auth/confirm`
- Statt `{{ .ConfirmationURL }}`

#### 3.2 Reset Password Template

1. Gehe zu: **Supabase Dashboard** → **Authentication** → **Email Templates** → **Reset Password**
2. Öffne `supabase/EMAIL_TEMPLATES_KOMPLETT.md` (Abschnitt "3️⃣ TEMPLATE: Reset Password")
3. Kopiere das **komplette HTML-Template** (ab Zeile 239)
4. Füge es in das Supabase Template-Feld ein
5. Klicke auf **Save**

**Wichtig:** Das Template verwendet jetzt:
- `https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=recovery&redirect_to=https://kletterliga-nrw.de/app/auth/reset-password`
- Statt `{{ .ConfirmationURL }}`

#### 3.3 Magic Link Template (optional)

1. Gehe zu: **Supabase Dashboard** → **Authentication** → **Email Templates** → **Magic Link**
2. Öffne `supabase/EMAIL_TEMPLATES_KOMPLETT.md` (Abschnitt "4️⃣ TEMPLATE: Magic Link")
3. Kopiere das **komplette HTML-Template** (ab Zeile 342)
4. Füge es in das Supabase Template-Feld ein
5. Klicke auf **Save**

**Wichtig:** Das Template verwendet jetzt:
- `https://kletterliga-nrw.de/api/auth/verify?token={{ .Token }}&type=magiclink&redirect_to=https://kletterliga-nrw.de/app/auth/confirm`
- Statt `{{ .ConfirmationURL }}`

#### 3.4 Invite user Template

**Keine Änderung nötig!** Das Invite-Template verwendet bereits einen eigenen Link (`{{ .Data.invite_url }}`).

---

## Schritt 4: Testen 🧪

### Test 1: E-Mail-Bestätigung

1. Registriere einen neuen Test-Benutzer
2. Prüfe die E-Mail
3. **Erwartetes Ergebnis:**
   - Link zeigt auf: `https://kletterliga-nrw.de/api/auth/verify?token=...&type=signup&...`
   - Nach Klick funktioniert die Bestätigung
   - Weiterleitung zu `/app/auth/confirm` funktioniert

### Test 2: Passwort-Reset

1. Gehe zu Profil → Passwort ändern
2. Gib eine E-Mail-Adresse ein
3. Prüfe die E-Mail
4. **Erwartetes Ergebnis:**
   - Link zeigt auf: `https://kletterliga-nrw.de/api/auth/verify?token=...&type=recovery&...`
   - Nach Klick funktioniert der Passwort-Reset
   - Weiterleitung zu `/app/auth/reset-password` funktioniert

### Test 3: Proxy-Endpoint direkt testen

Öffne im Browser:
```
https://kletterliga-nrw.de/api/auth/verify?token=TEST&type=signup&redirect_to=https://kletterliga-nrw.de/app/auth/confirm
```

**Erwartetes Ergebnis:**
- Weiterleitung zu Supabase (mit den Parametern)
- Oder Fehlermeldung, wenn Token ungültig (das ist normal)

---

## ✅ Erfolgskriterien

Nach der Implementierung sollten folgende Dinge funktionieren:

- [ ] ✅ Code ist deployed (Vercel)
- [ ] ✅ Environment-Variable ist gesetzt
- [ ] ✅ Confirm signup Template aktualisiert
- [ ] ✅ Reset Password Template aktualisiert
- [ ] ✅ Magic Link Template aktualisiert (optional)
- [ ] ✅ Links in E-Mails zeigen auf `kletterliga-nrw.de/api/auth/verify`
- [ ] ✅ Keine `*.supabase.co` Links mehr in E-Mails
- [ ] ✅ E-Mail-Bestätigung funktioniert
- [ ] ✅ Passwort-Reset funktioniert

---

## 🐛 Troubleshooting

### Problem: Links funktionieren nicht

**Lösung:**
1. Prüfe Vercel Logs (Dashboard → Dein Projekt → Logs)
2. Stelle sicher, dass `SUPABASE_URL` Environment-Variable gesetzt ist
3. Prüfe, ob `api/auth/verify.ts` deployed wurde

### Problem: Template-Variablen werden nicht ersetzt

**Lösung:**
1. Stelle sicher, dass du `{{ .Token }}` verwendest (mit Leerzeichen!)
2. Prüfe, ob das Template korrekt in Supabase gespeichert wurde
3. Teste mit einer neuen E-Mail

### Problem: Weiterleitung funktioniert nicht

**Lösung:**
1. Prüfe, ob Redirect URLs in Supabase korrekt konfiguriert sind
2. Stelle sicher, dass `/app/auth/confirm` und `/app/auth/reset-password` existieren
3. Prüfe Browser-Konsole auf Fehler

---

## 📚 Weitere Informationen

- Vollständige Anleitung: `supabase/KOSTENLOSE_CUSTOM_DOMAIN_LÖSUNG.md`
- Schnellstart: `KOSTENLOSE_LÖSUNG_ZUSAMMENFASSUNG.md`
- Unterschiede erklärt: `UNTERSCHIEDE_ERKLÄRT.md`
- Templates: `supabase/EMAIL_TEMPLATES_KOMPLETT.md`

---

## 🎉 Fertig!

Nach Abschluss aller Schritte zeigen alle Auth-Links auf deine Domain:
- ✅ Professionelles Aussehen
- ✅ E-Mail-Provider markieren Links nicht als "unsicher"
- ✅ Komplett kostenlos
- ✅ Gleiche Benutzererfahrung wie vorher
