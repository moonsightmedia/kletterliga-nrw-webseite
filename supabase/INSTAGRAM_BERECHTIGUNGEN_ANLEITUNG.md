# Instagram Berechtigungen - Genau das, was du einstellen musst

## 📸 Was du im Screenshot siehst

Du bist im **Meta Graph API Explorer** und hast bereits:
- ✅ App "Kletterliga" ausgewählt
- ✅ `instagram_basic` Berechtigung aktiviert
- ✅ `pages_read_engagement` Berechtigung aktiviert

## ✅ Gute Nachricht: Die Berechtigungen sind ausreichend!

Für die **Hashtag-Funktion** sind die beiden Berechtigungen, die du bereits hast, **ausreichend**:
- `instagram_basic` - Erlaubt grundlegende Instagram-Daten abzurufen
- `pages_read_engagement` - Erlaubt Engagement-Daten (Likes, Kommentare) zu lesen

## 🔧 Was du JETZT tun musst

### Schritt 1: Instagram Business Account auswählen

**Wichtig:** Du musst sicherstellen, dass du den richtigen Instagram-Account auswählst:

1. Im Graph API Explorer, rechts unter **"Nutzer oder Seite"**:
   - Stelle sicher, dass der Instagram Business Account **@kletterliga_nrw** ausgewählt ist
   - Falls nicht: Klicke auf das Dropdown und wähle den richtigen Account

### Schritt 2: Access Token generieren

1. Klicke auf den blauen Button **"Generate Instagram Access Token"**
2. Folge den Anweisungen auf dem Bildschirm
3. **Wichtig:** Kopiere den generierten Token - du wirst ihn brauchen!

### Schritt 3: Instagram Business Account ID finden

Nachdem du den Token generiert hast, musst du die **Instagram Business Account ID** finden:

1. Im Graph API Explorer, ändere die Abfrage zu:
   ```
   GET /me/accounts
   ```
2. Klicke auf **"Submit"** (oder Enter drücken)
3. In der Antwort findest du die `id` deiner Facebook-Seite (z.B. `"123456789012345"`)
4. Ändere die Abfrage dann zu (ersetze `{page-id}` mit der ID aus Schritt 3):
   ```
   GET /{page-id}?fields=instagram_business_account
   ```
   Beispiel: `GET /123456789012345?fields=instagram_business_account`
5. Klicke auf **"Submit"**
6. Die `instagram_business_account.id` ist die ID, die du benötigst (z.B. `"17841405309211844"`)

### Schritt 4: Token in Supabase speichern

1. Gehe zu deinem [Supabase Dashboard](https://supabase.com/dashboard)
2. Gehe zu **Project Settings** → **Edge Functions** → **Secrets**
3. Füge/aktualisiere den Secret:
   - **Name:** `INSTAGRAM_ACCESS_TOKEN`
   - **Wert:** Der Token aus Schritt 2
4. Speichere

### Schritt 5: Business Account ID in Supabase speichern

1. Im selben Supabase Secrets-Bereich:
2. Füge einen neuen Secret hinzu:
   - **Name:** `INSTAGRAM_BUSINESS_ACCOUNT_ID`
   - **Wert:** Die ID aus Schritt 3 (z.B. `17841405309211844`)
3. Speichere

## 🎯 Zusammenfassung - Was genau du einstellen musst

### Im Graph API Explorer:
- ✅ App: "Kletterliga" (bereits ausgewählt)
- ✅ Berechtigungen: `instagram_basic` und `pages_read_engagement` (bereits vorhanden)
- ✅ Instagram Account: Stelle sicher, dass @kletterliga_nrw ausgewählt ist
- ✅ Token generieren: Klicke auf "Generate Instagram Access Token"

### In Supabase Secrets:
- ✅ `INSTAGRAM_ACCESS_TOKEN` = Der generierte Token
- ✅ `INSTAGRAM_BUSINESS_ACCOUNT_ID` = Die Instagram Business Account ID

## ⚠️ Wichtige Hinweise

1. **Keine zusätzlichen Berechtigungen nötig:** Die beiden Berechtigungen, die du bereits hast, reichen aus. Du musst **keine weiteren** hinzufügen.

2. **Instagram Business Account ID ist wichtig:** Diese ID wird benötigt, um Hashtags zu durchsuchen. Ohne sie funktioniert die Hashtag-Funktion nicht.

3. **Token-Gültigkeit:** 
   - Short-Lived Token: 1 Stunde gültig
   - Long-Lived Token: 60 Tage gültig (empfohlen für Produktion)
   - Für Long-Lived Token: Siehe Haupt-Anleitung (`INSTAGRAM_SETUP_ANLEITUNG.md`)

4. **Testen:** Nach dem Setup kannst du die Hashtag-Funktion testen, indem du die Homepage öffnest und zur Sektion "TEILNEHMER-BEITRÄGE" scrollst.

## 🔍 Falls etwas nicht funktioniert

### Fehler: "Instagram Business Account ID not configured"
- **Lösung:** Stelle sicher, dass der Secret `INSTAGRAM_BUSINESS_ACCOUNT_ID` in Supabase existiert

### Fehler: "Hashtag not found"
- **Lösung:** Überprüfe, ob der Hashtag korrekt geschrieben ist (ohne # im Secret)

### Fehler: "Failed to fetch hashtag posts"
- **Lösung:** 
  - Überprüfe, ob beide Secrets korrekt gesetzt sind
  - Stelle sicher, dass der Instagram Account ein Business/Creator Account ist
  - Überprüfe, dass der Account mit einer Facebook-Seite verbunden ist

## 📝 Checkliste

- [ ] Graph API Explorer: App "Kletterliga" ausgewählt
- [ ] Graph API Explorer: Berechtigungen `instagram_basic` und `pages_read_engagement` aktiv
- [ ] Graph API Explorer: Instagram Account @kletterliga_nrw ausgewählt
- [ ] Graph API Explorer: Access Token generiert
- [ ] Graph API Explorer: Instagram Business Account ID gefunden
- [ ] Supabase: Secret `INSTAGRAM_ACCESS_TOKEN` gesetzt
- [ ] Supabase: Secret `INSTAGRAM_BUSINESS_ACCOUNT_ID` gesetzt
- [ ] Edge Function deployed: `supabase functions deploy get-instagram-feed`
- [ ] Homepage getestet: Posts mit #kletterliganrw werden angezeigt
