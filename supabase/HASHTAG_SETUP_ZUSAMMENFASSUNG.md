# Instagram Hashtag-Funktion - Schritt-für-Schritt Anleitung

Diese Anleitung erklärt, was du tun musst, um die Hashtag-Funktion zu aktivieren, die Posts von Teilnehmern nach Hashtag (z.B. #kletterliganrw) anzeigt.

## 📋 Voraussetzungen (MUSS erfüllt sein!)

### 1. Instagram Business oder Creator Account
- ✅ Der Instagram-Account (@kletterliga_nrw) **muss** ein Business- oder Creator-Account sein
- ❌ Persönliche Accounts funktionieren **nicht**

**Prüfen:**
- Öffne Instagram → Profil → Menü (☰) → Einstellungen → Account
- Unter "Account-Typ" sollte "Business" oder "Creator" stehen

**Falls nicht:**
- Gehe zu "Account-Typ wechseln" und wähle "Business" oder "Creator"

### 2. Facebook-Seite verbunden (PFlicht!)
- ✅ Der Instagram-Account **muss** mit einer Facebook-Seite verbunden sein
- ❌ Ohne Facebook-Seite funktioniert die Instagram Graph API **nicht**

**Prüfen:**
- Instagram → Profil → Menü → Einstellungen → Account → Verknüpfte Konten → Facebook
- Es sollte eine Facebook-Seite angezeigt werden

**Falls nicht:**
- Verbinde den Instagram-Account mit einer Facebook-Seite (siehe Haupt-Anleitung)

### 3. Meta Developer App mit richtigen Berechtigungen
- ✅ Eine Meta Developer App muss existieren
- ✅ Die App muss diese Berechtigungen haben:
  - `instagram_basic` (für normale Posts)
  - `pages_read_engagement` (für Hashtag-Suche)
  - `instagram_graph_user_media` (für eigene Posts)

### 4. Instagram Account als Tester hinzugefügt
- ✅ Der Instagram-Account muss als "Instagram Tester" in der Meta Developer App hinzugefügt sein
- ❌ Nur "App Administrator" reicht **nicht** aus

**Prüfen:**
- Gehe zu [Meta Developer Dashboard](https://developers.facebook.com/apps/)
- Wähle deine App → Rollen → Rollen
- Unter "Instagram Testers" sollte der Account @kletterliga_nrw stehen

## 🔧 Schritt-für-Schritt Setup

### Schritt 1: Instagram Business Account ID finden

Die Hashtag-Funktion benötigt die **Instagram Business Account ID** (nicht die normale User ID).

**Methode A: Über Graph API Explorer (Empfohlen)**

1. Gehe zum [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Wähle deine App aus dem Dropdown-Menü oben
3. Wähle den Access Token aus (derselbe wie für normale Posts)
4. Führe diese Abfrage aus:
   ```
   GET /me/accounts
   ```
5. In der Antwort findest du die `id` der Facebook-Seite (z.B. `"123456789012345"`)
6. Führe dann diese Abfrage aus (ersetze `{page-id}` mit der ID aus Schritt 5):
   ```
   GET /{page-id}?fields=instagram_business_account
   ```
   Beispiel: `GET /123456789012345?fields=instagram_business_account`
7. Die `instagram_business_account.id` ist die Instagram Business Account ID, die du benötigst
   - Sie sieht aus wie: `"17841405309211844"`

**Methode B: Über Meta Business Suite**

1. Gehe zu [Meta Business Suite](https://business.facebook.com/)
2. Wähle deine Facebook-Seite aus
3. Gehe zu **Einstellungen** → **Instagram-Konten**
4. Die Instagram Business Account ID wird dort angezeigt

**Methode C: Über Graph API direkt**

1. Öffne [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Wähle deine App und den Access Token
3. Führe aus:
   ```
   GET /me?fields=accounts{instagram_business_account{id}}
   ```
4. Die ID findest du unter `accounts.data[0].instagram_business_account.id`

### Schritt 2: Secret in Supabase hinzufügen

1. Gehe zu deinem [Supabase Dashboard](https://supabase.com/dashboard)
2. Wähle dein Projekt aus
3. Gehe zu **Project Settings** → **Edge Functions** → **Secrets**
4. Füge einen neuen Secret hinzu:
   - **Name:** `INSTAGRAM_BUSINESS_ACCOUNT_ID`
   - **Wert:** Die Instagram Business Account ID aus Schritt 1
5. Klicke auf **Save**

**Wichtig:**
- Der Name muss **exakt** `INSTAGRAM_BUSINESS_ACCOUNT_ID` sein (Groß-/Kleinschreibung beachten!)
- Es sollte bereits ein Secret `INSTAGRAM_ACCESS_TOKEN` existieren (für normale Posts)

### Schritt 3: Edge Function deployen

Die Edge Function muss deployed sein, damit die Hashtag-Funktion funktioniert.

**Option A: Über Terminal (Empfohlen)**

```bash
# Stelle sicher, dass du im Projekt-Verzeichnis bist
cd c:\Users\Janosch\Desktop\kletterliga-nrw-webseite

# Deploye die Edge Function
supabase functions deploy get-instagram-feed
```

**Option B: Über Supabase Dashboard**

1. Gehe zu **Edge Functions** im Supabase Dashboard
2. Wähle `get-instagram-feed`
3. Klicke auf **Deploy** oder **Redeploy**

### Schritt 4: Berechtigungen in Meta Developer App prüfen

Stelle sicher, dass deine Meta Developer App die richtigen Berechtigungen hat:

1. Gehe zu [Meta Developer Dashboard](https://developers.facebook.com/apps/)
2. Wähle deine App aus
3. Gehe zu **App Review** → **Permissions and Features**
4. Stelle sicher, dass folgende Berechtigungen vorhanden sind:
   - ✅ `instagram_basic`
   - ✅ `pages_read_engagement`
   - ✅ `instagram_graph_user_media`

**Falls Berechtigungen fehlen:**
- Gehe zu **App Review** → **Permissions and Features**
- Klicke auf die fehlende Berechtigung
- Folge den Anweisungen zur Aktivierung

### Schritt 5: Testen

Nach dem Setup kannst du die Hashtag-Funktion testen:

1. Öffne die Homepage der Website
2. Scrolle zur Sektion "TEILNEHMER-BEITRÄGE"
3. Es sollten Posts mit dem Hashtag #kletterliganrw angezeigt werden

**Falls keine Posts angezeigt werden:**
- Überprüfe die Browser-Konsole (F12) auf Fehlermeldungen
- Stelle sicher, dass es tatsächlich Posts mit dem Hashtag gibt
- Überprüfe, dass beide Secrets (`INSTAGRAM_ACCESS_TOKEN` und `INSTAGRAM_BUSINESS_ACCOUNT_ID`) korrekt gesetzt sind

## 🔍 Troubleshooting

### Fehler: "Instagram Business Account ID not configured"
- **Lösung:** Stelle sicher, dass der Secret `INSTAGRAM_BUSINESS_ACCOUNT_ID` in Supabase existiert und korrekt geschrieben ist

### Fehler: "Hashtag not found"
- **Lösung:** Überprüfe, ob der Hashtag korrekt geschrieben ist (ohne # im Secret, z.B. `kletterliganrw` nicht `#kletterliganrw`)

### Fehler: "Failed to fetch hashtag posts"
- **Lösung:** 
  - Überprüfe, ob die Instagram Business Account ID korrekt ist
  - Stelle sicher, dass die Berechtigungen `instagram_basic` und `pages_read_engagement` aktiviert sind
  - Überprüfe, ob der Access Token noch gültig ist

### Keine Posts werden angezeigt
- **Mögliche Ursachen:**
  1. Es gibt noch keine Posts mit dem Hashtag
  2. Die Instagram Business Account ID ist falsch
  3. Die Berechtigungen fehlen
  4. Der Access Token ist abgelaufen

## 📝 Zusammenfassung Checkliste

- [ ] Instagram Account ist Business/Creator Account
- [ ] Instagram Account ist mit Facebook-Seite verbunden
- [ ] Meta Developer App existiert
- [ ] Instagram Account ist als "Instagram Tester" hinzugefügt
- [ ] Instagram Business Account ID wurde gefunden
- [ ] Secret `INSTAGRAM_BUSINESS_ACCOUNT_ID` wurde in Supabase hinzugefügt
- [ ] Secret `INSTAGRAM_ACCESS_TOKEN` existiert bereits
- [ ] Edge Function wurde deployed
- [ ] Berechtigungen `instagram_basic` und `pages_read_engagement` sind aktiviert
- [ ] Hashtag-Funktion wurde getestet

## 🎯 Was passiert nach dem Setup?

Nach erfolgreichem Setup:
- Die Homepage zeigt automatisch Posts mit #kletterliganrw an
- Teilnehmer können ihre Posts mit dem Hashtag markieren
- Die Posts werden automatisch auf der Website angezeigt
- Die Anzahl der angezeigten Posts kann in `src/pages/Index.tsx` angepasst werden

## 📚 Weitere Informationen

Für detaillierte Informationen zur Instagram Graph API siehe:
- [Instagram Graph API Dokumentation](https://developers.facebook.com/docs/instagram-api)
- [Hashtag Search API](https://developers.facebook.com/docs/instagram-api/reference/ig-hashtag-search)
- [Hashtag Media API](https://developers.facebook.com/docs/instagram-api/reference/ig-hashtag/recent-media)
