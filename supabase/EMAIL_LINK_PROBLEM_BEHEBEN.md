# 🔗 Problem: Links zeigen auf Supabase-Domain statt eigene Domain

## Problem

In den E-Mails werden Links angezeigt, die auf `*.supabase.co` zeigen statt auf `kletterliga-nrw.de`:

```
https://ssxuurccefxfhxucgepo.supabase.co/auth/v1/verify?token=...&redirect_to=https://kletterliga-nrw.de
```

Diese Links werden von E-Mail-Providern als "unsicher" markiert.

## Ursache

Supabase generiert die `{{ .ConfirmationURL }}` immer mit der Supabase-Domain als Basis, auch wenn `emailRedirectTo` gesetzt ist. Der `redirect_to` Parameter zeigt zwar auf die eigene Domain, aber der Link selbst beginnt mit `*.supabase.co`.

## Lösung

### Option 1: Site URL korrekt konfigurieren (WICHTIG!)

Die **Site URL** in Supabase muss auf deine eigene Domain gesetzt sein:

1. Gehe zum [Supabase Dashboard](https://supabase.com/dashboard)
2. Wähle dein Projekt aus
3. Navigiere zu **Project Settings** → **Auth** → **URL Configuration**
4. Setze die **Site URL** auf: `https://kletterliga-nrw.de`
5. Stelle sicher, dass alle **Redirect URLs** eingetragen sind (siehe Checkliste)

**Wichtig:** Wenn die Site URL nicht korrekt gesetzt ist, verwendet Supabase die Supabase-Domain für alle Links!

### Option 2: Custom Domain für Auth (Erweiterte Lösung)

Für eine vollständige Lösung ohne Supabase-Domain in den Links:

1. **Custom Domain einrichten** (erfordert DNS-Konfiguration)
2. **Supabase Custom Domain** konfigurieren
3. Dann zeigen die Links auf deine eigene Domain

**Hinweis:** Dies ist eine erweiterte Konfiguration und erfordert DNS-Einstellungen.

### Option 3: Link-Struktur akzeptieren (Aktueller Stand)

Die aktuelle Lösung funktioniert so:
- Link zeigt auf: `https://*.supabase.co/auth/v1/verify?token=...&redirect_to=https://kletterliga-nrw.de/app/auth/confirm`
- Nach Klick auf den Link: Supabase verarbeitet den Token
- Dann Weiterleitung zu: `https://kletterliga-nrw.de/app/auth/confirm`
- Die eigene Domain wird nur im `redirect_to` Parameter verwendet

**Nachteil:** E-Mail-Provider können die Links als "unsicher" markieren.

## Aktuelle Situation

### Was funktioniert:
- ✅ Links funktionieren korrekt (leiten zur eigenen Domain weiter)
- ✅ `emailRedirectTo` wird verwendet
- ✅ Redirect URLs sind konfiguriert

### Was nicht optimal ist:
- ❌ Links beginnen mit `*.supabase.co` statt `kletterliga-nrw.de`
- ❌ E-Mail-Provider können Links als "unsicher" markieren

## Empfohlene Lösung

### Schritt 1: Site URL prüfen und setzen

**KRITISCH:** Stelle sicher, dass die Site URL in Supabase auf `https://kletterliga-nrw.de` gesetzt ist!

1. Supabase Dashboard → Project Settings → Auth → URL Configuration
2. **Site URL**: `https://kletterliga-nrw.de`
3. **Redirect URLs**: Alle URLs aus der Checkliste hinzufügen

### Schritt 2: E-Mail-Templates verwenden

Die Templates in `supabase/EMAIL_TEMPLATES_KOMPLETT.md` verwenden `{{ .ConfirmationURL }}`, was korrekt ist. Supabase wird diesen Link automatisch mit dem `redirect_to` Parameter generieren.

### Schritt 3: Testen

Nach der Konfiguration:
1. Registriere einen neuen Benutzer
2. Prüfe die E-Mail
3. Der Link sollte funktionieren und zur eigenen Domain weiterleiten
4. Auch wenn der Link mit `*.supabase.co` beginnt, sollte er funktionieren

## Warum zeigt der Link auf Supabase?

Supabase verwendet ihre Domain für die Token-Verarbeitung aus Sicherheitsgründen:
- Token-Verarbeitung erfolgt auf Supabase-Servern
- Dann Weiterleitung zur eigenen Domain über `redirect_to` Parameter
- Dies ist die Standard-Architektur von Supabase Auth

## Alternative: Eigener Auth-Server

Falls du komplett eigene Links möchtest (ohne Supabase-Domain):
- Müsstest du einen eigenen Auth-Server implementieren
- Oder Supabase Custom Domain konfigurieren (erfordert DNS)

## Fazit

**Die Links funktionieren korrekt**, auch wenn sie auf `*.supabase.co` zeigen. Sie leiten zur eigenen Domain weiter.

**Um das Problem zu minimieren:**
1. ✅ Stelle sicher, dass die **Site URL** korrekt gesetzt ist
2. ✅ Verwende die Templates aus `EMAIL_TEMPLATES_KOMPLETT.md`
3. ✅ Teste, ob die Links funktionieren

**Für eine vollständige Lösung ohne Supabase-Domain:**
- Custom Domain für Supabase Auth konfigurieren (erfordert DNS-Setup)
