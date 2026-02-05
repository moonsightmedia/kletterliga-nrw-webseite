# E-Mail-Bestätigung: Fix für Redirect und Sicherheit

## Problem

Es gab zwei Probleme mit der E-Mail-Bestätigung für neue Benutzer:

1. **Unsichere E-Mails**: E-Mail-Provider (z.B. web.de) markieren Links als "unsicher", wenn sie auf Supabase-Domains (`*.supabase.co`) zeigen, was die Links unbrauchbar macht.

2. **Falsche Weiterleitung**: Nach dem Klick auf den Bestätigungslink wurden Benutzer zur Homepage (`/`) weitergeleitet statt zur Login-Seite (`/app/login`).

## Lösung

### 1. Frontend-Änderungen

#### `src/app/auth/AuthProvider.tsx`
- `signUp()` Funktion wurde erweitert, um `emailRedirectTo` zu setzen
- Die Redirect-URL zeigt jetzt auf `/app/auth/confirm` auf der eigenen Domain
- Verwendet `window.location.origin` für die Frontend-URL

```typescript
const frontendUrl = typeof window !== 'undefined' 
  ? window.location.origin 
  : 'https://kletterliga-nrw.de';
const confirmUrl = `${frontendUrl}/app/auth/confirm`;

await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: confirmUrl,
    // ...
  },
});
```

#### `src/app/pages/auth/EmailConfirm.tsx` (NEU)
- Neue Komponente für die E-Mail-Bestätigungsseite
- Verarbeitet den Bestätigungstoken automatisch
- Zeigt Erfolgs- oder Fehlermeldungen an
- Leitet nach erfolgreicher Bestätigung zum Login weiter (mit `confirmed=true` Parameter)

#### `src/app/pages/auth/Login.tsx`
- Erweitert um Anzeige einer Bestätigungsnachricht
- Prüft auf `confirmed=true` URL-Parameter
- Zeigt grüne Erfolgsmeldung an, wenn E-Mail bestätigt wurde

#### `src/app/AppRoutes.tsx`
- Neue Route `/app/auth/confirm` hinzugefügt
- Route verwendet `EmailConfirm` Komponente

### 2. Supabase-Konfiguration

#### Redirect URLs in Supabase Dashboard
Stelle sicher, dass folgende URLs in den **Supabase Auth Settings** unter **Redirect URLs** eingetragen sind:

```
https://kletterliga-nrw.de/app/auth/confirm
https://kletterliga-nrw.de/*
http://localhost:8081/app/auth/confirm
http://localhost:8081/*
```

**Wichtig**: Die exakte Route `/app/auth/confirm` muss enthalten sein, damit Supabase die Redirect-URL akzeptiert.

#### E-Mail-Template für "Confirm signup"
Das E-Mail-Template im Supabase Dashboard sollte den `{{ .ConfirmationURL }}` Platzhalter verwenden. Dieser wird automatisch durch Supabase mit der korrekten Redirect-URL ersetzt.

**Beispiel-Template** (vereinfacht):
```
Klicke auf den folgenden Link, um deine E-Mail-Adresse zu bestätigen:

{{ .ConfirmationURL }}

Dieser Link ist 24 Stunden gültig.
```

**Hinweis**: Wenn du ein benutzerdefiniertes HTML-Template verwendest (wie für die anderen E-Mails), stelle sicher, dass `{{ .ConfirmationURL }}` enthalten ist.

## Ablauf nach der Fix

1. **Benutzer registriert sich** → `signUp()` wird mit `emailRedirectTo: "https://kletterliga-nrw.de/app/auth/confirm"` aufgerufen
2. **Supabase sendet E-Mail** → Link zeigt auf die eigene Domain (`kletterliga-nrw.de`) statt auf Supabase-Domain
3. **Benutzer klickt auf Link** → Wird zu `/app/auth/confirm` weitergeleitet
4. **EmailConfirm Komponente** → Verarbeitet Token, erstellt Session
5. **Weiterleitung zum Login** → Mit `confirmed=true` Parameter
6. **Login-Seite** → Zeigt grüne Erfolgsmeldung an

## Vorteile

- ✅ Links zeigen auf die eigene Domain → E-Mail-Provider markieren sie nicht als unsicher
- ✅ Benutzer werden zur Login-Seite weitergeleitet → Bessere UX
- ✅ Klare Erfolgsmeldung → Benutzer wissen, dass die Bestätigung erfolgreich war
- ✅ Automatische Token-Verarbeitung → Keine manuelle Eingabe nötig

## Testing

1. Registriere einen neuen Benutzer
2. Prüfe die E-Mail → Link sollte auf `kletterliga-nrw.de/app/auth/confirm` zeigen
3. Klicke auf den Link → Sollte zur Bestätigungsseite führen
4. Nach 2 Sekunden → Automatische Weiterleitung zum Login mit Erfolgsmeldung
5. Login → Benutzer kann sich einloggen

## Wichtige Hinweise

- Die `emailRedirectTo` URL muss in den Supabase Redirect URLs eingetragen sein
- Die Route `/app/auth/confirm` muss öffentlich zugänglich sein (kein ProtectedRoute)
- Der Token wird automatisch von Supabase verarbeitet, wenn der Benutzer auf den Link klickt
