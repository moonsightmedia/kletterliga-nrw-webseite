# Design System Document

## 1. Overview & Creative North Star

### Creative North Star: "The Elevated Ascent"
This design system rejects the "templated" look of generic athletic apps in favor of a **High-End Editorial** experience. We are not just building a climbing utility; we are curating a digital league that feels as rugged as a bouldering wall and as prestigious as a world-class competition.

The system is defined by **intentional asymmetry** and **tonal depth**. By utilizing overlapping elements—where climbing hold motifs and rope-knot textures break the boundaries of their containers—we create a sense of movement and physical presence. This is "Rugged Professionalism": a balance between the raw, tactile nature of the sport and the sophisticated clarity of a premium digital product.

---

## 2. Colors

Our palette is grounded in the earth and the sky, moving from deep oceanic navies to clay-like terracottas.

- **Primary Navy (#003D55):** The foundation of authority. Use for high-impact backgrounds and primary actions.
- **Secondary Terracotta (#A15523):** The "tactile" color. Used for interactive elements that require energy and heat.
- **Accent Cream (#F2DCAB):** The breathing room. This provides a sophisticated, "paper-like" warmth compared to sterile whites.

### The "No-Line" Rule
To achieve a signature look, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through background color shifts. For example, a `surface-container-low` section should sit against a `surface` background to create a clean, modern break without the clutter of lines.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers (`lowest` to `highest`) to create nested depth. An inner container (like a league table) should use a slightly higher tier than its parent section to define its importance through tonal contrast rather than structural borders.

### The "Glass & Gradient" Rule
To avoid a flat, "out-of-the-box" appearance, floating elements (like navigation bars or hovering scorecards) should utilize **Glassmorphism**. Combine semi-transparent surface colors with a `backdrop-blur` effect.
- **Signature Textures:** Use subtle linear gradients transitioning from `primary` to `primary_container` for hero sections. This adds a "visual soul" that mimics the natural light on a rock face.

---

## 3. Typography

The typography strategy pairs the brutalist, athletic strength of **Space Grotesk** (inspired by the 'Heavitas' vibe) with the high-legibility sophistication of **Manrope**.

- **Display & Headlines (Space Grotesk):** These are your "statements." Use these for league titles, scores, and major headers. The wide, modern stance conveys the "Rugged" aspect of the brand.
- **Body & Titles (Manrope):** These provide the "Professional" counterweight. Manrope’s clean, geometric proportions ensure that complex climbing data—grades, routes, and timings—remains effortlessly readable.

**Hierarchy Note:** Use high-contrast scales. A `display-lg` headline should feel massive and authoritative next to a well-spaced `body-md` description to create a sense of editorial importance.

---

## 4. Elevation & Depth

We eschew traditional drop shadows for **Tonal Layering**.

- **The Layering Principle:** Stacking is our primary tool. A `surface-container-lowest` card placed on a `surface-container-low` background creates a natural, soft lift.
- **Ambient Shadows:** When a true "float" is necessary (e.g., a floating action button), use extra-diffused shadows.
- **Blur:** Large (16px–24px).
- **Opacity:** Ultra-low (4%–8%).
- **Color:** Tint the shadow with `on_surface` (Navy) rather than pure black to mimic natural ambient light.
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` at **20% opacity**. Never use 100% opaque borders.
- **Backdrop Integration:** Use backdrop blurs on `surface_variant` containers to let the "earthy" background colors bleed through, softening the edges and making the UI feel like one cohesive environment.

---

## 5. Components

### Buttons
- **Primary:** `primary` background with `on_primary` text. Use `xl` (0.75rem) roundedness for a modern, approachable feel.
- **Secondary:** `secondary` (Terracotta) for high-energy actions.
- **Tertiary:** No background; use `surface_tint` for text. Hover states should trigger a subtle `surface-container-high` background shift.

### Chips (Bouldering Grades/Tags)
Use `secondary_container` for active filters and `surface_container_high` for inactive. Chips should have a "hold-like" feel—use the `full` roundedness scale.

### Inputs & Fields
- **Background:** `surface_container_low`.
- **Active State:** Indicated by a 2px bottom-bar in `primary` rather than a full box stroke.
- **Error:** Use the `error` token (#ba1a1a) for text and a 10% opacity `error_container` for the background.

### Cards & Lists
**Strict Rule:** No divider lines. Separate list items using vertical white space (use `4` or `5` from the spacing scale) or subtle alternating background shifts between `surface` and `surface_container_lowest`.

### Specialized Component: The "Route-Node"
For climbing routes, use a custom list item where the "Leading Element" is an icon based on a bouldering hold. The connection between items should be visualized with a vertical "Rope" line using `outline_variant` at 40% opacity, ending in a stylized "Knot" (the eighth-knot motif).

---

## 6. Do's and Don'ts

### Do:
- **Do use intentional asymmetry.** Align your "Display" type to the left while keeping "Body" type within a tighter, offset column to create an editorial feel.
- **Do use the Accent Cream (#F2DCAB) for high-contrast moments.** It works beautifully as a high-visibility surface for featured league stats.
- **Do embrace the Roundedness Scale.** Use `xl` for large cards and `full` for interactive chips to mimic the rounded edges of climbing holds.

### Don't:
- **Don't use 1px solid lines.** This immediately kills the premium, custom feel of this design system.
- **Don't use pure black (#000000) for text.** Always use the `on_surface` (Dark Navy) to maintain the brand’s sophisticated tonal depth.
- **Don't crowd the content.** Climbing is about space and reach; your UI should reflect that. Use the higher end of the Spacing Scale (`12`, `16`, `20`) for section margins.
- **Don't use default "Material" shadows.** Our shadows are whispers, not shouts. Keep them diffused and tinted.