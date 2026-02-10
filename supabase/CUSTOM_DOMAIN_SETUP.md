# 🌐 Custom Domain für Supabase Auth einrichten

Diese Anleitung zeigt dir, wie du eine Custom Domain für Supabase konfigurierst, damit **alle** Links (inklusive Auth-Links) auf deine eigene Domain zeigen statt auf `*.supabase.co`.

## ✅ Gute Nachricht

**Supabase unterstützt Custom Domains!** Wenn du eine Custom Domain einrichtest, zeigen **alle** Links (inklusive Auth-Links) auf deine eigene Domain.

## ⚠️ Voraussetzungen

1. **Bezahlter Supabase-Plan erforderlich** - Custom Domains sind ein **paid add-on** für Projekte auf einem bezahlten Plan (Pro/Team/Enterprise)
2. **Subdomain erforderlich** - Du kannst nur Subdomains verwenden (z.B. `api.kletterliga-nrw.de`), nicht die Root-Domain
3. **DNS-Zugriff** - Du musst DNS-Einstellungen für deine Domain ändern können

## Option A: Supabase Custom Domain (Offizielle Lösung - Empfohlen)

Dies ist die **offizielle Supabase-Lösung** und funktioniert für alle Endpunkte, einschließlich Auth.

### Schritt 1: Prüfe deinen Supabase-Plan

1. Gehe zum [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigiere zu **Project Settings** → **Addons**
3. Prüfe, ob **Custom Domain** verfügbar ist (erfordert bezahlten Plan: Pro/Team/Enterprise)
4. Falls nicht verfügbar, musst du zuerst auf einen bezahlten Plan upgraden

### Schritt 2: Custom Domain im Dashboard einrichten

1. Gehe zu **Project Settings** → **General** → **Custom Domains**
2. Klicke auf **Add Custom Domain**
3. Gib deine Subdomain ein: `api.kletterliga-nrw.de` (oder `auth.kletterliga-nrw.de`)
   - **Wichtig:** Nur Subdomains sind möglich, nicht die Root-Domain
   - Empfehlung: `api.kletterliga-nrw.de` (für alle API-Endpunkte)

### Schritt 3: DNS konfigurieren

Supabase gibt dir zwei DNS-Einträge, die du hinzufügen musst:

#### 3.1 CNAME Record

Erstelle einen **CNAME** Record bei deinem DNS-Provider:

- **Name**: `api` (oder `auth`, je nachdem welche Subdomain du gewählt hast)
- **Target**: `[dein-projekt-ref].supabase.co.` (mit Punkt am Ende!)
- **TTL**: 3600 (oder Auto)

**Beispiel:**
```
api.kletterliga-nrw.de → ssxuurccefxfhxucgepo.supabase.co.
```

#### 3.2 TXT Record für Domain-Verifizierung

Supabase gibt dir einen TXT Record für die Domain-Verifizierung:

- **Name**: `_acme-challenge.api` (oder `_acme-challenge.auth`)
- **Value**: Der Wert, den Supabase dir gibt (z.B. `ca3-F1HvR9i938OgVwpCFwi1jTsbhe1hvT0Ic3efPY3Q`)
- **TTL**: 3600

**Wichtig:** 
- Manche DNS-Provider fügen automatisch die Domain hinzu. In diesem Fall erstelle den Record nur für `_acme-challenge.api` statt `_acme-challenge.api.kletterliga-nrw.de`

### Schritt 4: Domain verifizieren

1. Nach dem Hinzufügen der DNS-Records, klicke auf **Verify** im Supabase Dashboard
2. Supabase prüft die DNS-Records und erstellt automatisch ein SSL-Zertifikat
3. Dieser Prozess kann bis zu 30 Minuten dauern

### Schritt 5: Domain aktivieren

1. Sobald die Verifizierung erfolgreich ist, kannst du die Domain **aktivieren**
2. **Wichtig:** Nach der Aktivierung zeigen **alle** Links auf deine Custom Domain:
   - Auth-Links: `https://api.kletterliga-nrw.de/auth/v1/verify`
   - Edge Functions: `https://api.kletterliga-nrw.de/functions/v1/...`
   - Storage: `https://api.kletterliga-nrw.de/storage/v1/...`

### Schritt 6: Supabase Client aktualisieren (Optional)

Du kannst deinen Supabase Client auf die Custom Domain umstellen:

```typescript
import { createClient } from '@supabase/supabase-js'

// Alte URL (funktioniert weiterhin)
const supabaseOld = createClient(
  'https://ssxuurccefxfhxucgepo.supabase.co',
  'publishable-key'
)

// Neue URL mit Custom Domain
const supabaseNew = createClient(
  'https://api.kletterliga-nrw.de',
  'publishable-key'
)
```

**Wichtig:** Die alte Supabase-Domain funktioniert weiterhin, du musst nicht sofort umstellen.

### Schritt 7: E-Mail-Templates aktualisieren

Nach der Aktivierung der Custom Domain zeigen die Links automatisch auf deine Domain:

- `{{ .ConfirmationURL }}` zeigt dann auf: `https://api.kletterliga-nrw.de/auth/v1/verify?token=...`
- Keine Änderungen an den Templates nötig!

## Option B: Supabase CLI (Alternative)

Du kannst die Custom Domain auch über die CLI einrichten:

### Schritt 1: CLI installieren und einloggen

```bash
# CLI installieren (falls noch nicht installiert)
npm install -g supabase

# Einloggen
supabase login
```

### Schritt 2: Domain registrieren

```bash
supabase domains create \
  --project-ref ssxuurccefxfhxucgepo \
  --custom-hostname api.kletterliga-nrw.de
```

Dies gibt dir die DNS-Records, die du hinzufügen musst.

### Schritt 3: DNS-Records hinzufügen

Füge die CNAME und TXT Records bei deinem DNS-Provider hinzu (siehe Option A, Schritt 3).

### Schritt 4: Domain verifizieren

```bash
supabase domains reverify --project-ref ssxuurccefxfhxucgepo
```

Warte, bis die Verifizierung erfolgreich ist (kann einige Minuten dauern).

### Schritt 5: Domain aktivieren

```bash
supabase domains activate --project-ref ssxuurccefxfhxucgepo
```

## ⚠️ Wichtige Hinweise

### OAuth Provider aktualisieren

Wenn du OAuth Provider verwendest, musst du die Callback-URLs aktualisieren:

1. Gehe zu jedem OAuth Provider (Google, GitHub, etc.)
2. Füge die neue Callback-URL hinzu: `https://api.kletterliga-nrw.de/auth/v1/callback`
3. **Wichtig:** Füge die neue URL **zusätzlich** zur alten hinzu, nicht als Ersatz!

### SAML Provider aktualisieren

Falls du SAML verwendest:
- Kontaktiere deinen SAML Provider
- Bitte um Update der Metadata auf die neue Domain
- Die EntityID ändert sich zu: `https://api.kletterliga-nrw.de/auth/v1/sso/saml/...`

### Kosten

Custom Domains sind ein **paid add-on**. Prüfe die aktuellen Preise im Supabase Dashboard.

## Empfohlene Lösung

**Für die beste UX und professionelle E-Mail-Links:**

1. ✅ **Supabase Plan upgraden** - Falls noch nicht auf Pro/Team/Enterprise Plan
2. ✅ **Custom Domain einrichten** - Option A (Dashboard) oder Option B (CLI)
3. ✅ **DNS konfigurieren** - CNAME und TXT Records hinzufügen
4. ✅ **Domain aktivieren** - Nach erfolgreicher Verifizierung
5. ✅ **E-Mail-Templates verwenden** - Die Templates aus `EMAIL_TEMPLATES_KOMPLETT.md` verwenden (keine Änderungen nötig!)

**Nach der Aktivierung:**
- ✅ Alle Auth-Links zeigen auf `https://api.kletterliga-nrw.de/auth/v1/verify`
- ✅ Keine `*.supabase.co` Links mehr in E-Mails
- ✅ Professionelles Branding
- ✅ E-Mail-Provider markieren Links nicht als "unsicher"

## Nächste Schritte

1. **Prüfe deinen Supabase-Plan** - Upgrade auf Pro/Team/Enterprise falls nötig
2. **Wähle eine Subdomain** - Empfehlung: `api.kletterliga-nrw.de`
3. **Richte die Custom Domain ein** - Über Dashboard oder CLI
4. **Konfiguriere DNS** - CNAME und TXT Records hinzufügen
5. **Aktiviere die Domain** - Nach erfolgreicher Verifizierung

## Beispiel-Konfiguration

**Subdomain:** `api.kletterliga-nrw.de`

**DNS Records:**
```
CNAME: api → ssxuurccefxfhxucgepo.supabase.co.
TXT: _acme-challenge.api → [von Supabase bereitgestellter Wert]
```

**Ergebnis:**
- Auth-Links: `https://api.kletterliga-nrw.de/auth/v1/verify?token=...`
- Edge Functions: `https://api.kletterliga-nrw.de/functions/v1/...`
- Storage: `https://api.kletterliga-nrw.de/storage/v1/...`

## Fragen?

Falls du Hilfe bei der Einrichtung benötigst, kann ich dir bei den einzelnen Schritten helfen!
