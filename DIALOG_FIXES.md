# 🔧 Dialog/Pop-up Fixes

## Problem

Die Dialog-Titel wurden oben abgeschnitten, besonders bei längeren Texten wie "ZUGANG FÜR TESTER". Dies führte zu einer schlechten visuellen Darstellung.

## Lösung

### 1. DialogContent Verbesserungen

**Datei:** `src/components/ui/dialog.tsx`

- ✅ **Overflow-Handling**: `overflow-hidden` entfernt, stattdessen `overflow-y-auto` auf Mobile und `overflow-hidden` auf Desktop
- ✅ **Default Padding**: `sm:p-6` für Desktop-Dialoge hinzugefügt (kann durch `className` überschrieben werden)
- ✅ **Close-Button Position**: Immer oben rechts (`right-4 top-4`) mit `z-10` für korrekte Überlagerung

### 2. DialogHeader Verbesserungen

**Datei:** `src/components/ui/dialog.tsx`

- ✅ **Mobile Padding**: `pt-6 px-6` für Mobile (Bottom Sheet Style)
- ✅ **Desktop Padding**: `sm:pt-0 sm:px-0` für Desktop (wird durch DialogContent Padding gehandhabt)
- ✅ **Flexible Überschreibung**: Kann durch `className` überschrieben werden (z.B. `!px-6 !pt-6`)

### 3. DialogTitle Verbesserungen

**Datei:** `src/components/ui/dialog.tsx`

- ✅ **Line Height**: `leading-none` → `leading-tight` für bessere Lesbarkeit
- ✅ **Right Padding**: `pr-8 sm:pr-10` um Platz für Close-Button zu schaffen
- ✅ **Kein Abschneiden**: Titel wird nicht mehr oben abgeschnitten

## Betroffene Dialoge

Alle Dialoge wurden überprüft und sollten jetzt korrekt funktionieren:

1. ✅ **ComingSoonPage** - "Zugang für Tester" Dialog
2. ✅ **Profile** - "Profil bearbeiten", "Verlauf", "Änderung der Wertungsklasse anfragen"
3. ✅ **ResultEntry** - "Feedback zur Route"
4. ✅ **LeagueGyms** - "Halle bearbeiten"
5. ✅ **LeagueParticipants** - "Profil bearbeiten", "Profil löschen"
6. ✅ **GymRoutesAdmin** - "Route bearbeiten"
7. ✅ **LeagueRoutes** - "Route bearbeiten"
8. ✅ **MastercodeRedeem** - "Mastercode scannen"
9. ✅ **GymRedeem** - "Code scannen"
10. ✅ **LeagueRouteFeedback** - "Feedback zur Route"
11. ✅ **LeagueResults** - "Feedback zur Route"

## Technische Details

### Mobile (Bottom Sheet)
- Dialog öffnet von unten
- Padding oben (`pt-6`) für Titel
- Padding links/rechts (`px-6`) für Inhalte
- Scrollbar wenn Inhalt zu lang ist

### Desktop (Centered Modal)
- Dialog zentriert auf dem Bildschirm
- Padding durch DialogContent (`p-6`)
- Close-Button oben rechts
- Titel hat rechts Padding für Close-Button

### Custom Padding

Dialoge mit custom Padding (z.B. `p-0`) können das default Padding überschreiben:

```tsx
<DialogContent className="p-0">
  <DialogHeader className="!px-6 !pt-6">
    <DialogTitle>Custom Dialog</DialogTitle>
  </DialogHeader>
</DialogContent>
```

## Testing

Bitte teste folgende Dialoge:

1. ✅ ComingSoonPage - "Zugang für Tester" Dialog
   - Titel sollte vollständig sichtbar sein
   - Close-Button sollte oben rechts sein
   - Kein Text sollte abgeschnitten werden

2. ✅ Profile - Alle Dialoge
   - Titel sollten vollständig sichtbar sein
   - Close-Button sollte nicht den Titel überlappen

3. ✅ Alle anderen Dialoge
   - Sollten konsistent aussehen
   - Titel sollten nicht abgeschnitten werden

## Vorher/Nachher

### Vorher:
- ❌ Titel wurde oben abgeschnitten
- ❌ Close-Button überlappte möglicherweise den Titel
- ❌ Inkonsistentes Padding

### Nachher:
- ✅ Titel vollständig sichtbar
- ✅ Close-Button hat genug Platz
- ✅ Konsistentes Padding auf Mobile und Desktop
- ✅ Professionelles Aussehen
