# 🎨 Toast-Benachrichtigungen Design

Die Toast-Benachrichtigungen wurden an das Kletterliga NRW Design angepasst und sind jetzt optisch schöner und konsistenter.

## ✨ Design-Verbesserungen

### 1. Farbige Akzent-Streifen
Alle Toasts haben jetzt einen linken Akzent-Streifen:
- **Default/Erfolg**: Dunkelblau (#003D55) - Kletterliga Primärfarbe
- **Success**: Grün - für positive Aktionen
- **Destructive/Fehler**: Rot - für Fehlermeldungen

### 2. Icons
- ✅ **Success/Default**: CheckCircle2 Icon in Primärfarbe oder Grün
- ⚠️ **Destructive**: AlertCircle Icon in Rot

### 3. Kletterliga-Farben
Die Toasts verwenden die Kletterliga-Farben:
- **Hintergrund**: Weiß (Light Mode) / Dunkelblau (Dark Mode)
- **Text**: Dunkelblau (#003D55) / Beige (Dark Mode)
- **Border**: Subtile Kletterliga-Farben
- **Akzent**: Primärfarbe (#003D55) für Default-Toasts

## 📋 Verfügbare Varianten

### 1. Default (Standard)
```typescript
toast({
  title: "Titel",
  description: "Beschreibung",
  // variant: "default" ist optional
});
```
- **Verwendung**: Für allgemeine Informationen
- **Design**: Dunkelblauer Akzent-Streifen, CheckCircle2 Icon

### 2. Success (Erfolg)
```typescript
toast({
  title: "Erfolg",
  description: "Aktion erfolgreich abgeschlossen",
  variant: "success",
});
```
- **Verwendung**: Für erfolgreiche Aktionen (Registrierung, E-Mail gesendet, etc.)
- **Design**: Grüner Akzent-Streifen, grünes CheckCircle2 Icon, grüner Border

### 3. Destructive (Fehler)
```typescript
toast({
  title: "Fehler",
  description: "Etwas ist schiefgelaufen",
  variant: "destructive",
});
```
- **Verwendung**: Für Fehlermeldungen
- **Design**: Roter Hintergrund, rotes AlertCircle Icon, roter Akzent-Streifen

## 🎯 Best Practices

### Erfolgs-Toasts verwenden
Für alle erfolgreichen Aktionen sollte `variant: "success"` verwendet werden:
- ✅ Registrierung erfolgreich
- ✅ E-Mail gesendet
- ✅ Passwort zurückgesetzt
- ✅ Daten gespeichert
- ✅ Einladung gesendet

### Fehler-Toasts verwenden
Für alle Fehler sollte `variant: "destructive"` verwendet werden:
- ❌ Validierungsfehler
- ❌ Server-Fehler
- ❌ Netzwerk-Fehler

### Default-Toasts verwenden
Für allgemeine Informationen:
- ℹ️ Hinweise
- 📋 Status-Updates

## 📝 Beispiele

### E-Mail-bezogene Toasts

```typescript
// Registrierung erfolgreich
toast({
  title: "Registrierung erfolgreich!",
  description: "Wir haben dir eine E-Mail zur Bestätigung gesendet.",
  variant: "success",
});

// E-Mail gesendet
toast({
  title: "E-Mail gesendet",
  description: "Bitte prüfe dein Postfach.",
  variant: "success",
});

// Passwort zurückgesetzt
toast({
  title: "Erfolg",
  description: "Dein Passwort wurde erfolgreich zurückgesetzt.",
  variant: "success",
});

// Fehler
toast({
  title: "Fehler",
  description: "Die E-Mail konnte nicht gesendet werden.",
  variant: "destructive",
});
```

## 🎨 Design-Details

### Akzent-Streifen
- **Position**: Links, 4px breit, volle Höhe
- **Farbe**: 
  - Default: `hsl(var(--primary))` = #003D55
  - Success: `green-500`
  - Destructive: `hsl(var(--destructive))`

### Icons
- **Größe**: 20px (h-5 w-5)
- **Position**: Links neben dem Text
- **Farbe**: Entspricht der Variante

### Border
- **Default**: Standard Border-Farbe
- **Success**: Grüner Border (`border-green-200` / `dark:border-green-800`)
- **Destructive**: Roter Border (automatisch durch destructive Variante)

## 🌙 Dark Mode

Die Toasts passen sich automatisch an den Dark Mode an:
- **Hintergrund**: Dunkler Hintergrund
- **Text**: Heller Text (Beige)
- **Border**: Angepasste Farben für besseren Kontrast

## ✅ Aktualisierte Toasts

Folgende Toasts verwenden jetzt die neue `success` Variante:
- ✅ Registrierung erfolgreich
- ✅ E-Mail gesendet (Passwort-Reset)
- ✅ Passwort zurückgesetzt
- ✅ Einladung gesendet
- ✅ Halle erfolgreich registriert

## 📚 Weitere Informationen

- Toast-Komponente: `src/components/ui/toast.tsx`
- Toaster-Komponente: `src/components/ui/toaster.tsx`
- Toast Hook: `src/hooks/use-toast.ts`
