# Instagram Feed Setup Anleitung

Diese Anleitung erklärt, wie du den Instagram Access Token für die Instagram-Feed-Einbettung auf der Startseite einrichtest und wie du die Hashtag-Funktion konfigurierst.

## Übersicht

Die Instagram-Feed-Funktion verwendet die Instagram Graph API, um:
1. Die letzten Posts von @kletterliga_nrw auf der Startseite anzuzeigen
2. Posts von Teilnehmern nach Hashtag zu filtern (z.B. #kletterliganrw)

Der Access Token und die Business Account ID werden sicher in Supabase Edge Functions gespeichert.

**Wichtige Voraussetzungen:**

1. **Instagram Business oder Creator Account:** Der Account muss ein Business- oder Creator-Account sein (nicht persönlich)
2. **Facebook-Seite verbinden:** Der Instagram-Account **muss** mit einer Facebook-Seite verbunden sein (Pflicht!)
3. **Meta Developer App:** Eine App im Meta Developer Dashboard erstellen

**Hinweis:** Die Implementierung nutzt `graph.instagram.com`, was Teil der Instagram Graph API ist. Ohne Facebook-Seiten-Verbindung funktioniert die API nicht.

## Schritt 0: Instagram-Account vorbereiten (WICHTIG!)

**Bevor du beginnst:** Stelle sicher, dass der Instagram-Account (@kletterliga_nrw) die folgenden Voraussetzungen erfüllt:

### 1. Business oder Creator Account

1. Öffne die Instagram-App oder Instagram.com
2. Gehe zu **Profil** → **Menü** (☰) → **Einstellungen**
3. Gehe zu **Account** → **Account-Typ wechseln**
4. Wähle **Business** oder **Creator**
5. Folge den Anweisungen zur Umwandlung

### 2. Facebook-Seite verbinden (PFlicht!)

**Option A: Über Instagram-App:**

1. Gehe zu **Profil** → **Menü** (☰) → **Einstellungen**
2. Gehe zu **Account** → **Verknüpfte Konten** → **Facebook**
3. Falls noch keine Facebook-Seite verbunden ist:
   - Klicke auf **"Facebook-Seite verbinden"**
   - Melde dich mit deinem Facebook-Account an
   - Wähle eine bestehende Facebook-Seite aus oder erstelle eine neue
   - Bestätige die Verbindung

**Option B: Über Facebook Business Manager:**

1. Gehe zu [Facebook Business Manager](https://business.facebook.com/)
2. Erstelle eine neue Facebook-Seite (falls noch keine existiert)
3. Gehe zu **Einstellungen** → **Instagram-Konten**
4. Klicke auf **"Instagram-Konto hinzufügen"**
5. Verbinde den Instagram-Account (@kletterliga_nrw) mit der Facebook-Seite

**Wichtig:** Ohne Facebook-Seiten-Verbindung funktioniert die Instagram Graph API nicht!

## Schritt 1: Meta Developer Account erstellen

1. Gehe zu [Meta for Developers](https://developers.facebook.com/) (wichtig: `developers.facebook.com`, nicht `business.facebook.com`)
2. Melde dich mit deinem Facebook-Account an (oder erstelle einen neuen)
3. Falls du auf `business.facebook.com` landest, navigiere manuell zu `developers.facebook.com`
4. Klicke auf "Meine Apps" → "App erstellen"

## Schritt 2: Instagram Basic Display App erstellen

1. Wähle den App-Typ "Consumer" aus
2. Gib einen App-Namen ein (z.B. "Kletterliga NRW Instagram Feed")
3. Gib eine Kontakt-E-Mail-Adresse ein
4. Klicke auf "App erstellen"

## Schritt 3: Instagram-Account als Tester hinzufügen (WICHTIG!)

**Bevor du den Token generierst:** Der Instagram-Account muss explizit als Tester zur App hinzugefügt werden.

**WICHTIG:** Du musst zu **"Instagram-Tester"** gehen, NICHT zu "Testnutzerkonten" (Facebook Test Users)!

1. Gehe zu deiner Meta Developer App → **"Rollen"** (Roles) im linken Menü
2. **Wichtig:** Klicke auf den Tab **"Instagram-Tester"** (Instagram Testers)
   - **NICHT** auf "Testnutzerkonten" (das ist für Facebook-Testnutzer, nicht für Instagram!)
   - **NICHT** auf "Tester" (das ist für Facebook-Tester)
   - Du brauchst speziell den Tab **"Instagram-Tester"**
3. Klicke auf **"Instagram-Tester hinzufügen"** oder **"Rollen hinzufügen"**
4. Gib den Instagram-Benutzernamen ein: `kletterliga_nrw` (ohne @)
   - Oder verwende die E-Mail-Adresse, die mit dem Instagram-Account verbunden ist
5. Klicke auf **"Hinzufügen"** oder **"Einladung senden"**
6. **Wichtig:** Das Instagram-Konto muss die Einladung akzeptieren:
   - Überprüfe die Instagram-App für Benachrichtigungen
   - Oder gehe zu Instagram → Einstellungen → Apps und Websites → Einladungen
   - Oder überprüfe die E-Mail-Inbox

**Ohne diesen Schritt funktioniert die Token-Generierung nicht!**

**Hinweis:** Falls du den Tab "Instagram-Tester" nicht siehst:
- Stelle sicher, dass du den Anwendungsfall "Messaging und Content auf Instagram verwalten" hinzugefügt hast (Schritt 4)
- Die App muss die Instagram API aktiviert haben
- Versuche, die Seite zu aktualisieren

## Schritt 4: Instagram API hinzufügen

Nach dem Erstellen der App wirst du zum Bildschirm "Anwendungsfälle hinzufügen" weitergeleitet:

1. **Wichtig:** Suche nach der Option **"Messaging und Content auf Instagram verwalten"**
   - Diese Option ermöglicht den Zugriff auf die Instagram API (inkl. Basic Display API)
   - Sie erscheint möglicherweise nicht unter "Empfohlen"
2. Falls nicht sichtbar:
   - Klicke links auf **"Alle"** oder **"Content-Management"**, um alle verfügbaren Optionen zu sehen
   - Scrolle durch die Liste und suche nach "Messaging und Content auf Instagram verwalten"
3. Aktiviere das Kontrollkästchen bei **"Messaging und Content auf Instagram verwalten"**
4. Klicke auf "Weiter" oder "Speichern"

**Hinweis:** Nach dem Hinzufügen dieser Option musst du später noch das spezifische Produkt "Instagram Basic Display" unter "Produkte" aktivieren (siehe Schritt 4).

## Schritt 5: Instagram Graph API konfigurieren

Nach dem Klick auf "Messaging und Content auf Instagram verwalten" wirst du zur Instagram Graph API Einrichtungsseite weitergeleitet. Du solltest folgende Informationen sehen:

- **Instagram-App-ID**: (z.B. `894623156490429`)
- **Instagram-App-Geheimcode**: (versteckt, kann mit "Anzeigen" sichtbar gemacht werden)

**Wichtig:** Für unseren Feed-Use Case benötigen wir nicht alle Berechtigungen. Du kannst die folgenden Schritte überspringen oder später durchführen:

1. **Schritt 1: Erforderliche Messaging-Berechtigungen** - Nicht notwendig für unseren Feed
2. **Schritt 2: Zugriffstokens generieren** - **WICHTIG:** Diesen Schritt musst du später durchführen
3. **Schritt 3: Webhooks konfigurieren** - Nicht notwendig für unseren Feed

**Für jetzt:** Notiere dir die **Instagram-App-ID** und den **Instagram-App-Geheimcode** (falls sichtbar), aber du musst die Berechtigungen noch nicht hinzufügen. Wir werden den Token später über einen anderen Weg generieren.

## Schritt 6: App konfigurieren

1. Gehe zu **"Einstellungen"** → **"Grundlegend"** (im linken Menü)
2. Füge eine **"App-Domäne"** hinzu (z.B. `kletterliga-nrw.de`)
3. Optional: Füge **"Gültige OAuth-Weiterleitungs-URIs"** hinzu:
   - Für Entwicklung: `https://localhost:3000/auth/instagram/callback`
   - Für Produktion: `https://kletterliga-nrw.de/auth/instagram/callback`
   - **Hinweis:** Diese URIs werden nur für die initiale Token-Generierung benötigt

## Schritt 7: Instagram User Token generieren

**Voraussetzung:** Der Instagram-Account (@kletterliga_nrw) muss ein **Business** oder **Creator** Account sein und mit einem Facebook-Seite verbunden sein.

### Option A: Graph API Explorer (Einfachste Methode)

1. Gehe zu [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Wähle deine App aus dem Dropdown-Menü oben rechts
3. Klicke auf **"Zugriffstoken abrufen"** (Get Token)
4. Wähle **"Instagram Graph API User Token"**
5. Wähle die Berechtigungen:
   - `instagram_graph_user_profile`
   - `instagram_graph_user_media`
6. Klicke auf **"Zugriffstoken generieren"**
7. Kopiere den generierten Token

**Wichtig:** Dieser Token ist ein Short-Lived Token (1 Stunde gültig). Für Produktion solltest du einen Long-Lived Token erstellen (siehe Option B).

### Option B: Long-Lived Token (Empfohlen für Produktion)

Ein Long-Lived Token ist 60 Tage gültig und kann erneuert werden:

1. Generiere zunächst einen Short-Lived Token (siehe Option A)
2. Hole dir den **Instagram App Secret** aus den App-Einstellungen:
   - Gehe zu **"Einstellungen"** → **"Grundlegend"**
   - Klicke auf **"Anzeigen"** neben "Instagram-App-Geheimcode"
   - Kopiere den Secret
3. Rufe folgende URL auf (ersetze `SHORT_LIVED_TOKEN` und `YOUR_CLIENT_SECRET`):
   ```
   https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=YOUR_CLIENT_SECRET&access_token=SHORT_LIVED_TOKEN
   ```
4. Der zurückgegebene `access_token` ist ein Long-Lived Token (60 Tage gültig)

### Token erneuern (vor Ablauf)

Um einen Long-Lived Token zu erneuern, rufe folgende URL auf:
```
https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=LONG_LIVED_TOKEN
```

## Schritt 8: Token in Supabase konfigurieren

1. Öffne dein [Supabase Dashboard](https://supabase.com/dashboard)
2. Wähle dein Projekt aus
3. Gehe zu "Project Settings" → "Edge Functions" → "Secrets"
4. Füge eine neue Secret-Variable hinzu:
   - **Name:** `INSTAGRAM_ACCESS_TOKEN`
   - **Wert:** Dein Instagram Access Token (aus Schritt 5)
5. Klicke auf "Save"

## Schritt 9: Edge Function deployen

Die Edge Function `get-instagram-feed` muss deployed werden:

```bash
# Lokal testen (optional)
supabase functions serve get-instagram-feed

# Deployen
supabase functions deploy get-instagram-feed
```

Oder über das Supabase Dashboard:
1. Gehe zu "Edge Functions"
2. Wähle `get-instagram-feed`
3. Klicke auf "Deploy"

## Schritt 10: Testen

1. Öffne die Startseite der Website
2. Scrolle zur Instagram-Section (vor dem CTA-Bereich)
3. Die letzten 6 Instagram-Posts sollten angezeigt werden

## Fehlerbehebung

### "Entwickler-Rolle nicht ausreichend" (Developer role not sufficient)

Dieser Fehler tritt auf, wenn das Instagram-Konto nicht die richtige Rolle in der Meta Developer App hat oder andere Voraussetzungen nicht erfüllt sind.

**Lösungsschritte:**

1. **Überprüfe den Instagram-Account-Typ:**
   - Der Instagram-Account (@kletterliga_nrw) muss ein **Business** oder **Creator** Account sein
   - Gehe zu Instagram → Einstellungen → Account → Account-Typ wechseln
   - Falls es ein persönlicher Account ist, konvertiere ihn zu einem Business/Creator Account

2. **Überprüfe die Facebook-Seiten-Verbindung:**
   - Der Instagram Business/Creator Account muss mit einer **Facebook-Seite** verbunden sein
   - Gehe zu Instagram → Einstellungen → Account → Verknüpfte Konten → Facebook-Seite
   - Falls keine Seite verknüpft ist, verknüpfe eine Facebook-Seite

3. **Überprüfe die App-Rollen (KRITISCH!):**
   
   **Schritt-für-Schritt Anleitung:**
   
   a. Gehe zu deiner Meta Developer App im Dashboard
   b. Im linken Menü, klicke auf **"Rollen"** (Roles)
   c. Du solltest verschiedene Rollen-Tabs sehen: "Administratoren", "Entwickler", "Tester", "Instagram-Tester", etc.
   d. Klicke auf den Tab **"Instagram-Tester"** (Instagram Testers)
   e. Klicke auf **"Instagram-Tester hinzufügen"** oder **"Rollen hinzufügen"**
   f. Gib den **Instagram-Benutzernamen** ein: `kletterliga_nrw` (ohne @)
     - Oder verwende die E-Mail-Adresse, die mit dem Instagram-Account verbunden ist
   g. Klicke auf **"Hinzufügen"** oder **"Einladung senden"**
   h. **Wichtig:** Das Instagram-Konto muss die Einladung akzeptieren
     - Überprüfe die Instagram-App oder E-Mails für eine Einladung
     - Oder gehe direkt zu Instagram → Einstellungen → Apps und Websites → Einladungen
   
   **Wichtig:** Auch wenn du App-Admin bist und die Facebook-Seite verbunden ist, muss der Instagram-Account **explizit** als Instagram-Tester hinzugefügt werden!

4. **Alternative Token-Generierung über Graph API Explorer:**
   - Gehe zu [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   - Stelle sicher, dass du mit dem **Facebook-Konto** eingeloggt bist, das die Instagram-Seite verwaltet
   - Wähle deine App aus dem Dropdown
   - Generiere den Token mit den Berechtigungen `instagram_graph_user_profile` und `instagram_graph_user_media`

5. **Falls der Fehler weiterhin besteht:**
   - Überprüfe, ob die App im **Entwicklungsmodus** ist (nicht veröffentlicht)
   - Für Entwicklungsmodus müssen alle Test-Konten explizit hinzugefügt werden
   - Versuche, die App zu veröffentlichen (falls möglich) oder warte auf die App-Review

**Häufige Ursachen:**
- Instagram-Account ist kein Business/Creator Account
- **Instagram-Account ist nicht mit einer Facebook-Seite verbunden** ← Das ist oft das Hauptproblem!
- Instagram-Account wurde nicht explizit als Tester zur App hinzugefügt (auch wenn du App-Admin bist)

**Schnell-Check für Facebook-Seiten-Verbindung:**

1. Öffne Instagram → **Profil** → **Einstellungen** → **Account** → **Verknüpfte Konten**
2. Überprüfe, ob eine Facebook-Seite angezeigt wird
3. Falls nicht: Folge den Schritten in **Schritt 0** dieser Anleitung

### "Instagram access token not configured"
- Stelle sicher, dass `INSTAGRAM_ACCESS_TOKEN` in Supabase Secrets konfiguriert ist
- Überprüfe, dass der Secret-Name exakt `INSTAGRAM_ACCESS_TOKEN` lautet (Groß-/Kleinschreibung beachten)
- Für Hashtag-Funktion: Stelle sicher, dass `INSTAGRAM_BUSINESS_ACCOUNT_ID` ebenfalls konfiguriert ist
- Überprüfe, dass die zusätzlichen Berechtigungen (`instagram_basic`, `pages_read_engagement`) in der Meta Developer App aktiviert sind

### "Failed to fetch Instagram posts"
- Überprüfe, ob der Token noch gültig ist (Short-Lived Tokens laufen nach 1 Stunde ab)
- Verwende einen Long-Lived Token für Produktion
- Überprüfe die Instagram API Rate Limits (200 Requests/Stunde)
- Stelle sicher, dass der Instagram-Account ein **Business** oder **Creator** Account ist
- Überprüfe, ob der Account mit einer Facebook-Seite verbunden ist

### "Invalid OAuth Access Token"
- Der Token ist abgelaufen oder ungültig
- Generiere einen neuen Token (siehe Schritt 5)
- Aktualisiere den Token in Supabase Secrets

### Keine Posts werden angezeigt
- Überprüfe, ob der Instagram-Account @kletterliga_nrw öffentlich ist
- Stelle sicher, dass der Token die richtigen Berechtigungen hat (`instagram_graph_user_media`)
- Überprüfe die Browser-Konsole für Fehlermeldungen
- Stelle sicher, dass der Account ein Business/Creator Account ist und mit einer Facebook-Seite verbunden ist
- Überprüfe, ob der Account die richtige Rolle in der App hat (siehe Fehler "Entwickler-Rolle nicht ausreichend")

## API Limits

- **Rate Limit:** 200 Requests pro Stunde pro User Token
- **Token-Gültigkeit:**
  - Short-Lived Token: 1 Stunde
  - Long-Lived Token: 60 Tage (kann erneuert werden)

## Empfehlungen

1. **Verwende Long-Lived Tokens** für Produktion
2. **Richte Token-Erneuerung ein** (z.B. alle 50 Tage) um Unterbrechungen zu vermeiden
3. **Implementiere Caching** in der Edge Function (optional) um API-Calls zu reduzieren
4. **Überwache API-Nutzung** im Meta Developer Dashboard

## Weitere Ressourcen

- [Instagram Basic Display API Dokumentation](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Instagram Graph API Dokumentation](https://developers.facebook.com/docs/instagram-api)
- [Meta Developer Tools](https://developers.facebook.com/tools/)
