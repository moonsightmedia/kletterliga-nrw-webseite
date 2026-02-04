# Kletterliga NRW – Style Guide

Dieser Guide beschreibt das visuelle System so, dass ein neues Projekt denselben Look erreicht.

## Design-Tokens

### Farben (HSL, aus `src/index.css`)
- `--kl-primary`: 195 100% 17%  (Dunkelblau #003D55)
- `--kl-secondary`: 24 65% 39%  (Braun #A15523)
- `--kl-accent`: 40 76% 81%   (Beige #F2DCAB)

### Semantische Tokens
- `--primary`, `--secondary`, `--accent`, `--background`, `--foreground`, `--muted`, `--border`
- Fokus-Ring: `--ring`
- Radius: `--radius` = 0.75rem

### Fonts
- Headline: `Heavitas` (Datei: `public/fonts/Heavitas.ttf`)
- Body: `Inter` (Google Fonts in `index.html`)

## Typografie

Headline-Styles (global, `src/index.css`)
- `h1..h6`: `font-family: Heavitas`, `font-weight: 700`, leichtes Tracking
- Große Headlines: typ. `text-4xl` bis `text-7xl`, großzügige Zeilenhöhe

Fließtext
- `text-muted-foreground` + `leading-relaxed`
- `text-lg` für Section-Intro

## Layout & Grid

### Container
- `container-kl`: `max-w-7xl`, zentriert, horizontales Padding

### Section-Spacing
- `section-padding`: `px-4 py-16`, ab `md`/`lg` mehr Luft

### Page Layout
- `PageLayout` (`src/components/layout/PageLayout.tsx`)
  - `SponsorBanner`, `Header`, `Footer`
  - `main` als Inhaltsbereich

## Komponenten-Patterns

### Buttons (`src/components/ui/button.tsx`)
- Grundstil: leicht schräg (`-skew-x-6`) und uppercase
- Varianten:
  - `default` (primary), `secondary`, `outline`, `ghost`, `link`
- Größen: `sm`, `default`, `lg`, `icon`

Beispiel:
```
<Button variant="secondary" size="lg">Jetzt teilnehmen</Button>
```

### Cards
- `card-kl`: abgerundet, Schatten, leichte Lift-Hover

### Links / Navigation
- Links oft mit `-skew-x-6` + `skew-x-6` auf innerem `span`
- Hover: `hover:bg-accent/90`, `hover:text-primary`

## Formen & Stilmerkmale

- Schräge Kanten als Leitmotiv (`-skew-x-6`)
- Diagonale Stripes als Hintergrund-Akzent (siehe `PageHeader`)
- „Paper Noise“ über SVG-Noise (siehe `PageHeader`/`HeroSection`)
- Kontrastreiches Duo: Dunkelblau + Braun mit Beige als Akzent

## Animationen

Verfügbar (Tailwind & CSS):
- `animate-fade-in-up`
- `animate-fade-in`
- `animate-scale-in`
- Delay-Utilities: `delay-100` bis `delay-500`

## Startpunkt für neue Projekte

1. `tailwind.config.ts` übernehmen
2. `src/index.css` übernehmen
3. `public/fonts/Heavitas.ttf` + Google Font `Inter`
4. UI-Komponenten (`src/components/ui/*`)
5. Layout-Pattern (`Header`, `Footer`, `PageHeader`, `PageLayout`)

## Referenzkomponenten

- Header: `src/components/layout/Header.tsx`
- Footer: `src/components/layout/Footer.tsx`
- PageHeader: `src/components/layout/PageHeader.tsx`

## Short Checklist

- [ ] Farben als HSL-Tokens gesetzt
- [ ] Heavitas + Inter eingebunden
- [ ] `-skew-x-6` als Stilmerkmal eingesetzt
- [ ] `card-kl`, `section-padding`, `container-kl` übernommen
- [ ] `button` Varianten übernommen
- [ ] `PageHeader` für Key-Visuals genutzt
