# Einfache Instagram-Feed Lösung (Manuelle Konfiguration)

Diese Lösung ist viel einfacher als die Instagram Graph API und funktioniert sofort ohne komplexes Setup.

## Wie es funktioniert

Statt die Instagram API zu verwenden, werden die Post-URLs manuell in einer Config-Datei gespeichert. Die Posts werden dann direkt angezeigt.

## Posts hinzufügen

1. Öffne `src/data/instagramPosts.ts`
2. Füge neue Posts zur Liste hinzu:

```typescript
{
  id: "1", // Eindeutige ID
  permalink: "https://www.instagram.com/p/ABC123/", // Instagram-URL
  imageUrl: "https://...", // Direkter Bild-Link
  caption: "Optional: Caption-Präview",
  timestamp: "2025-02-05", // Optional
}
```

## Bild-URL finden

1. Gehe zu Instagram.com und öffne den Post
2. Rechtsklick auf das Bild → "Bildadresse kopieren"
3. Oder: Rechtsklick → "Bild in neuem Tab öffnen" → URL aus der Adressleiste kopieren

## Vorteile

- ✅ Keine API-Tokens nötig
- ✅ Keine komplexe Konfiguration
- ✅ Funktioniert sofort
- ✅ Keine Rate Limits
- ✅ Funktioniert mit jedem Instagram-Account (auch persönlich)

## Nachteile

- ⚠️ Posts müssen manuell aktualisiert werden
- ⚠️ Nicht automatisch synchronisiert

## Empfehlung

Für die meisten Websites ist diese Lösung ausreichend. Du kannst die Posts alle paar Wochen oder Monate aktualisieren, wenn neue wichtige Posts veröffentlicht wurden.
