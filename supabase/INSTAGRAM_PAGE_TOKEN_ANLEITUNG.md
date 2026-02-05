# Instagram Page Access Token für Hashtag-Suche

## Problem

Der normale User Access Token funktioniert für eigene Posts (`/me/media`), aber **nicht** für Hashtag-Suche (`ig_hashtag_search`). Für Hashtag-Suche benötigst du einen **Page Access Token**.

## Lösung: Page Access Token generieren

### Schritt 1: Facebook-Seiten-ID finden

1. Gehe zum [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Stelle sicher, dass deine App "Kletterliga" ausgewählt ist
3. Verwende einen User Access Token (der normale Token)
4. Führe diese Abfrage aus:
   ```
   GET /me/accounts
   ```
5. In der Antwort findest du deine Facebook-Seiten-ID und einen `access_token` für die Seite
   ```json
   {
     "data": [
       {
         "name": "Kletterliga NRW",
         "id": "123456789012345",  ← Facebook-Seiten-ID
         "access_token": "EAAxxx..."  ← Page Access Token (das brauchst du!)
       }
     ]
   }
   ```

### Schritt 2: Page Access Token in Supabase speichern

1. Gehe zu deinem [Supabase Dashboard](https://supabase.com/dashboard)
2. Gehe zu **Project Settings** → **Edge Functions** → **Secrets**
3. **Option A:** Ersetze den bestehenden `INSTAGRAM_ACCESS_TOKEN` mit dem Page Access Token
   - Oder
4. **Option B:** Erstelle einen neuen Secret `INSTAGRAM_PAGE_ACCESS_TOKEN` und verwende diesen für Hashtag-Suche

### Schritt 3: Edge Function anpassen (falls Option B)

Falls du Option B gewählt hast, muss die Edge Function angepasst werden, um den Page Token für Hashtag-Suche zu verwenden.

## Wichtig

- Der **Page Access Token** hat mehr Berechtigungen und funktioniert für:
  - Eigene Posts (`/me/media`)
  - Hashtag-Suche (`ig_hashtag_search`)
  - Hashtag-Posts (`/{hashtag-id}/recent_media`)

- Der **User Access Token** funktioniert nur für:
  - Eigene Posts (`/me/media`)

## Empfehlung

**Verwende den Page Access Token für beide Funktionen** (normale Posts und Hashtag-Suche). Ersetze einfach den `INSTAGRAM_ACCESS_TOKEN` in Supabase mit dem Page Access Token aus Schritt 1.
