# Testing-Anleitung: Halle-Einladung lokal vs. Produktion

## Kurzantwort

**Du kannst lokal testen**, aber für vollständiges Testen (inkl. E-Mail-Versand) brauchst du die Produktions-Domain.

## Lokales Testen

### Was funktioniert lokal:

✅ **Frontend-Funktionalität**:
- Formular-Layout (Mobile/Desktop)
- Logo-Upload-Funktionalität
- Validierung der Eingaben
- UI/UX-Tests

✅ **Backend-Logik** (wenn Supabase lokal läuft):
- Token-Validierung
- Datenbank-Zugriffe
- Edge Functions (wenn lokal deployed)

### Was funktioniert NICHT lokal:

❌ **E-Mail-Versand**: 
- E-Mails werden lokal nicht versendet
- Du kannst die Links aber in den Supabase Logs finden

❌ **Einladungslinks**:
- Links zeigen auf `localhost:3000` statt auf die Produktions-Domain
- Du kannst die Links manuell testen, indem du sie anpasst

## Lokales Testen einrichten

### Option 1: Lokales Supabase (komplex)

1. **Supabase lokal starten**:
   ```bash
   npx supabase start
   ```

2. **Edge Functions lokal deployen**:
   ```bash
   npx supabase functions serve
   ```

3. **Frontend starten**:
   ```bash
   npm run dev
   ```

4. **Umgebungsvariablen anpassen**:
   - `.env.local` auf lokale Supabase-URL setzen
   - Lokale Supabase-URL ist normalerweise `http://localhost:54321`

**Nachteil**: Komplex, benötigt Docker

### Option 2: Produktions-Supabase mit lokalem Frontend (empfohlen)

1. **Frontend lokal starten**:
   ```bash
   npm run dev
   ```

2. **Umgebungsvariablen prüfen**:
   - `.env.local` sollte auf Produktions-Supabase zeigen
   - `VITE_SUPABASE_URL=https://ssxuurccefxfhxucgepo.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=[dein-anon-key]`

3. **Testen**:
   - Frontend läuft auf `http://localhost:8081` (oder anderem Port)
   - Backend läuft auf Produktions-Supabase
   - E-Mails werden versendet (wenn SMTP konfiguriert ist)
   - **Aber**: Links in E-Mails zeigen auf `https://kletterliga-nrw.de`, nicht auf localhost

**Vorteil**: Einfach, nutzt echte Datenbank und E-Mail-Versand

## Produktions-Testing (empfohlen)

### Vorteile:

✅ Vollständiges Testen aller Funktionen
✅ Echte E-Mail-Versendung
✅ Korrekte Links in E-Mails
✅ Realistische Umgebung

### Nachteile:

⚠️ Änderungen sind sofort live
⚠️ Kann echte Daten beeinflussen

## Empfohlener Workflow

### 1. Lokales Frontend-Testing (schnell)

```bash
# Frontend starten
npm run dev

# Teste:
# - Formular-Layout
# - Logo-Upload UI
# - Validierung
# - Mobile-Responsiveness
```

**Vorteil**: Schnell, keine Auswirkungen auf Produktion

### 2. Produktions-Testing (vollständig)

Nach lokalem Testing:

1. **Migrationen anwenden** (siehe unten)
2. **Edge Functions deployen**
3. **Auf Produktions-Domain testen**:
   - Echte E-Mail-Einladung senden
   - Link in E-Mail öffnen
   - Vollständigen Registrierungsprozess testen

## Migration anwenden

### Problem im Terminal:

Der Fehler `Remote migration versions not found in local migrations directory` bedeutet, dass die lokalen Migrationen nicht mit der Remote-Datenbank übereinstimmen.

### Lösung: Migration direkt im Supabase Dashboard anwenden

1. **Gehe zum Supabase Dashboard**:
   - [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Wähle dein Projekt aus

2. **Gehe zu SQL Editor**

3. **Führe die Migration aus**:
   - Kopiere den Inhalt von `supabase/migrations/20250205_fix_gym_invites_public_read.sql`
   - Füge ihn in den SQL Editor ein
   - Klicke auf "Run"

4. **Lösche alte Einladung** (für paulineannalioba@gmail.com):
   - Kopiere den Inhalt von `supabase/delete_old_invite.sql`
   - Füge ihn in den SQL Editor ein
   - Klicke auf "Run"

### Alternative: Migration-Reparatur

Falls du die Migrationen synchronisieren willst:

```bash
# Migration-Status reparieren
npx supabase migration repair --status reverted 20250204

# Oder: Lokale Migrationen mit Remote synchronisieren
npx supabase db pull
```

## Test-Checkliste

### Lokales Testing:

- [ ] Frontend startet ohne Fehler
- [ ] Formular wird korrekt angezeigt
- [ ] Logo-Upload funktioniert
- [ ] Validierung funktioniert
- [ ] Mobile-Layout sieht gut aus
- [ ] Desktop-Layout sieht gut aus

### Produktions-Testing:

- [ ] Migration wurde angewendet
- [ ] Edge Functions wurden deployed
- [ ] E-Mail-Einladung kann gesendet werden
- [ ] Link in E-Mail zeigt auf korrekte Domain
- [ ] Einladungsseite lädt korrekt
- [ ] Token-Validierung funktioniert
- [ ] Registrierung funktioniert vollständig
- [ ] Logo wird hochgeladen und gespeichert

## Schnelltest lokal

Für schnelles lokales Testing ohne E-Mail-Versand:

1. **Frontend starten**: `npm run dev`
2. **Manuell Einladung erstellen** (im Supabase Dashboard):
   - SQL Editor → Erstelle eine Test-Einladung
   - Kopiere den Token
   - Öffne `http://localhost:8081/app/invite/gym/[token]`

**SQL für Test-Einladung**:
```sql
INSERT INTO gym_invites (email, token, expires_at)
VALUES (
  'test@example.com',
  'test-token-123',
  NOW() + INTERVAL '7 days'
);
```

Dann öffne: `http://localhost:8081/app/invite/gym/test-token-123`

## Zusammenfassung

- **Lokales Testing**: Gut für Frontend/UI-Tests, schnell
- **Produktions-Testing**: Notwendig für vollständiges Testing, besonders E-Mail-Funktionalität
- **Empfehlung**: Kombiniere beide - lokal für schnelle Iterationen, Produktion für finale Tests
