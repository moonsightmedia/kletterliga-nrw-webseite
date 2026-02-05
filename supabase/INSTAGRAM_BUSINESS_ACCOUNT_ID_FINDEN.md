# Instagram Business Account ID finden - Schritt für Schritt

## 🎯 Was du brauchst

Die **Instagram Business Account ID** (auch bei Creator Accounts so genannt) ist eine lange Zahl wie `17841405309211844`. Diese ID wird benötigt, um Hashtags zu durchsuchen.

## 📋 Methode 1: Über Graph API Explorer (Einfachste Methode)

### Schritt 1: Facebook-Seiten-ID finden

1. Gehe zum [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Stelle sicher, dass:
   - Deine App "Kletterliga" ausgewählt ist
   - Ein Access Token vorhanden ist (falls nicht, generiere einen)
3. Im Abfragefeld, ändere die Abfrage zu:
   ```
   GET /me/accounts
   ```
4. Klicke auf **"Submit"** (oder drücke Enter)
5. In der Antwort findest du ein Array `data` mit deinen Facebook-Seiten
6. Suche nach der `id` deiner Facebook-Seite (z.B. `"123456789012345"`)
   - Das ist eine lange Zahl, die deine Facebook-Seite identifiziert
   - Notiere dir diese ID!

**Beispiel-Antwort:**
```json
{
  "data": [
    {
      "name": "Kletterliga NRW",
      "id": "123456789012345",  ← Das ist die Facebook-Seiten-ID
      "access_token": "..."
    }
  ]
}
```

### Schritt 2: Instagram Business Account ID abrufen

1. Im Graph API Explorer, ändere die Abfrage zu:
   ```
   GET /{page-id}?fields=instagram_business_account
   ```
   **Wichtig:** Ersetze `{page-id}` mit der ID aus Schritt 1!
   
   **Beispiel:** Wenn deine Facebook-Seiten-ID `123456789012345` ist:
   ```
   GET /123456789012345?fields=instagram_business_account
   ```

2. Klicke auf **"Submit"** (oder drücke Enter)

3. In der Antwort findest du:
   ```json
   {
     "instagram_business_account": {
       "id": "17841405309211844"  ← Das ist die Instagram Business Account ID!
     }
   }
   ```

4. **Kopiere diese ID** (`17841405309211844` im Beispiel) - das ist die `INSTAGRAM_BUSINESS_ACCOUNT_ID`, die du brauchst!

## 📋 Methode 2: Über Meta Business Suite (Alternative)

1. Gehe zu [Meta Business Suite](https://business.facebook.com/)
2. Melde dich mit deinem Facebook-Account an
3. Wähle deine Facebook-Seite aus (die mit Instagram verbunden ist)
4. Gehe zu **Einstellungen** (Settings) → **Instagram-Konten** (Instagram Accounts)
5. Dort siehst du deinen Instagram-Account (@kletterliga_nrw)
6. Die **Instagram Business Account ID** wird dort angezeigt (z.B. `17841405309211844`)

## 📋 Methode 3: Direkt über Graph API (Für Fortgeschrittene)

1. Im Graph API Explorer, verwende diese Abfrage:
   ```
   GET /me?fields=accounts{instagram_business_account{id}}
   ```
2. Klicke auf **"Submit"**
3. In der Antwort findest du die ID unter:
   ```
   accounts.data[0].instagram_business_account.id
   ```

## ✅ Was du jetzt hast

Nach einer der Methoden solltest du eine ID haben, die so aussieht:
- `17841405309211844` (18-stellige Zahl)
- Oder ähnlich lang (kann zwischen 15-20 Stellen haben)

**Das ist deine `INSTAGRAM_BUSINESS_ACCOUNT_ID`!**

## 🔧 Nächster Schritt: In Supabase speichern

1. Gehe zu deinem [Supabase Dashboard](https://supabase.com/dashboard)
2. Wähle dein Projekt aus
3. Gehe zu **Project Settings** → **Edge Functions** → **Secrets**
4. Klicke auf **"Add new secret"** oder **"Neues Secret hinzufügen"**
5. Fülle aus:
   - **Name:** `INSTAGRAM_BUSINESS_ACCOUNT_ID`
   - **Wert:** Die ID, die du gerade gefunden hast (z.B. `17841405309211844`)
6. Klicke auf **"Save"** oder **"Speichern"**

## ⚠️ Wichtige Hinweise

- Die ID ist eine **lange Zahl** (15-20 Stellen), keine URL oder Text
- Sie beginnt normalerweise mit `17` oder `18`
- **Kein #** oder andere Zeichen - nur Zahlen!
- Die ID ist **öffentlich** und kann nicht geheim gehalten werden (kein Sicherheitsrisiko)

## 🔍 Troubleshooting

### Problem: "No data returned" bei `/me/accounts`
- **Lösung:** Stelle sicher, dass dein Facebook-Account eine Seite hat und dass du die richtigen Berechtigungen hast

### Problem: "instagram_business_account is null"
- **Lösung:** 
  - Stelle sicher, dass dein Instagram-Account mit der Facebook-Seite verbunden ist
  - Überprüfe, dass der Instagram-Account ein Business- oder Creator-Account ist
  - Gehe zu Instagram → Einstellungen → Account → Verknüpfte Konten → Facebook

### Problem: "Access token is invalid"
- **Lösung:** Generiere einen neuen Access Token im Graph API Explorer

## 📝 Checkliste

- [ ] Graph API Explorer geöffnet
- [ ] App "Kletterliga" ausgewählt
- [ ] Abfrage `GET /me/accounts` ausgeführt
- [ ] Facebook-Seiten-ID gefunden
- [ ] Abfrage `GET /{page-id}?fields=instagram_business_account` ausgeführt
- [ ] Instagram Business Account ID gefunden (z.B. `17841405309211844`)
- [ ] ID in Supabase Secret `INSTAGRAM_BUSINESS_ACCOUNT_ID` gespeichert
