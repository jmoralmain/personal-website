# Design System

The visual language of the portfolio. Where `VISION.md` says *what it should
feel like*, this says *exactly which colors, type, spacing, and motion deliver
that feeling*. These are the tokens code references — no hard-coded hex, no
one-off font sizes.

> **The mood in one line:** a quiet night atlas. You drift just above a dark
> earth surface and wander it to find photos; labels are small and mono but
> calm — never tactical; one electric-lime marker is the only loud thing on
> screen. (Style reference: INVERSA, relaxed.)

---

## 1. Design principles

1. **The content is the color.** The UI is warm-cream-on-near-black, plus one
   lime accent. All other color comes from the photos and the naturalistic
   terrain — chrome never competes with content.
2. **A surface, not a prop.** This is the *earth at night*, seen from low
   altitude: dark moss terrain under a thin field of stars, a low warm sun.
   You traverse it; you don't orbit a decoration. Behind the globe is open
   night sky — sparse vellum stars over a near-black canvas with an olive
   cast (`#13140e`) — organic dark, never `#000000`.
3. **Flat, shadowless, instrument-panel.** No box-shadows, no blur, no
   gradients in chrome. Depth comes from color contrast and typographic scale.
   Hairline `1px` borders in iron-filings grey; radius is 3.6px on controls
   and zero on cards/images.
4. **One survey marker.** Lime (`#ebfc72`) is the only chromatic accent —
   active states, tags, the coordinate dot. Region hues exist but are muted
   naturalistic earth tones that never out-shout the lime.
5. **Mono is the interface voice — but relaxed.** Every UI label, tag, and
   button is JetBrains Mono in sentence case: quiet and instrument-like
   without reading as a mission briefing. Inter carries the editorial voice
   (hero, headings, body) at generous sizes with tight `-0.03em` tracking.

---

## 2. Color

### 2.1 Foundation (field-terminal) palette

The instrument panel. These are the CSS tokens (`css/style.css` `:root`) and
their WebGL twins (`js/core/theme.js`) — **one palette, two consumers**.

| Token                    | Hex        | Role                                          |
| ------------------------ | ---------- | --------------------------------------------- |
| `--color-obsidian-loam`  | `#13140e`  | Page canvas — near-black with an olive cast   |
| `--color-bone-vellum`    | `#f4f3e8`  | Primary text/strokes — paper, not LCD white   |
| `--color-iron-filings`   | `#404040`  | Hairline borders, dividers                    |
| `--color-drift-ash`      | `#84837b`  | Muted secondary text, metadata                |
| `--color-lime-surveyor`  | `#ebfc72`  | THE accent — survey marker, active states     |
| `--color-marsh-olive`    | `#bacd31`  | Deeper lime stop (fades, WebGL fill light)    |

Semantic aliases map onto these (`--bg`, `--text`, `--text-dim`, `--line`,
`--accent`, `--accent-2`, `--panel-bg`) — components reference the semantic
names. The page background is **flat** `--bg`; no gradients.

### 2.2 Terrain palette (WebGL only)

The globe surface — naturalistic moss-and-earth tones, lit by a low warm sun.
Lives in `THEME.terrain` in `js/core/theme.js` (no CSS twin; the DOM never
shows terrain).

| Key     | Hex        | Role                       |
| ------- | ---------- | -------------------------- |
| `low`   | `#2a3120`  | Shadowed valleys           |
| `base`  | `#3a4529`  | Moss ground                |
| `mid`   | `#55663b`  | Vegetated mid-tones        |
| `high`  | `#79904f`  | Lit ridgelines             |

The tones sit well clear of the obsidian canvas so the ground reads as a lit
surface at night, never a void. The terrain is bare — no grid lines over it;
the photos and trails are the only marks on the ground. Around the globe, a
sparse static field of vellum **stars** (`sceneSetup.js _addSky`) turns the
empty canvas into open night sky.

### 2.3 Region accents

Each region owns one **muted, naturalistic** hue — earth, vegetation, water.
They mark tile borders and the swatch inside each region-jump button. They are
deliberately quiet so the lime survey marker stays the loudest note. These
match `THEME.regions` in `theme.js` and the manifest `color` field.

| Region           | Token                  | Hex        | Character        |
| ---------------- | ---------------------- | ---------- | ---------------- |
| Climbing         | `--region-climbing`    | `#d98e62`  | Canyon clay      |
| Landscape        | `--region-landscape`   | `#a8bf7a`  | Sage green       |
| Music            | `--region-music`       | `#c98a93`  | Dust rose        |
| Portrait         | `--region-portrait`    | `#e6d8ab`  | Bone gold        |
| Professional     | `--region-professional`| `#7fa9b8`  | Slate water      |

> Wayfinding comes from **position** (where the region sits on the surface),
> **label**, and the **coordinates readout** — never hue alone.

### 2.4 Semantic / state colors

| Token         | Hex        | Role                                  |
| ------------- | ---------- | ------------------------------------- |
| `--warn`      | `#ffb84d`  | Missing-asset placeholder border, soft warnings |
| `--error`     | `#ff5d5d`  | Hard manifest errors (dev-facing)     |

### 2.5 Color usage rules

- **Lime is alone by design.** Any element that needs to be *noticed* —
  active region button, intro tag, coordinate dot, hover emphasis — uses
  `--accent`. Never introduce a second loud accent.
- Region hues are decoration and identification, never UI emphasis and never
  body text (they fail contrast on the dark canvas).
- Text is always `--text` / `--text-dim` / `--text-faint`. No gradient fills
  on type — the old gradient wordmark is gone.
- Do not use `#000000` anywhere; the olive undertone of the loam is what makes
  the dark feel organic rather than digital.

---

## 3. Typography

### 3.1 Type families

| Role              | Family                                              | Token         |
| ----------------- | --------------------------------------------------- | ------------- |
| Editorial (hero, headings, body) | `Inter`, then `system-ui` (substitute for NB International Pro) | `--font-sans` |
| Telemetry (labels, tags, buttons, coords, captions) | `JetBrains Mono`, then `ui-monospace` | `--font-mono` |

Two families, two jobs. No third font. Loaded from Google Fonts with
`display=swap` (Inter 400/500/600, JetBrains Mono 300/400/700).

### 3.2 Type scale

| Token        | Size                              | Use                          |
| ------------ | --------------------------------- | ---------------------------- |
| `--fs-hero`  | `clamp(2.6rem, 7vw, 4.5rem)`      | Hero name (intro), lh 0.9    |
| `--fs-h2`    | `1.8rem` (~29px)                  | Panel titles, lh 1.06        |
| `--fs-body`  | `1rem`                            | Panel body, lh 1.62          |
| `--fs-label` | `0.8125rem` (13px)                | All mono labels/tags/buttons |

### 3.3 Type rules

- **Weights:** Inter stays at 400 even at hero size — the *tight line-height
  (0.9) and tracking* create the mass, not stroke weight. 500 only for the
  small wordmark.
- **Tracking:** `-0.03em` on all Inter text (`--track-display`, set on `body`);
  mono is always `letter-spacing: normal` — reset it on every mono element.
- **Everything is sentence case** — mono labels included. No uppercase
  shouting, no index numbers; the calm comes from the type, not from
  formatting. All text is left-aligned; never center body text.

---

## 4. Depth, light & material

The 3D scene *is* the design — these rules keep it coherent with the 2-D UI.

### 4.1 Lighting

- **Ambient:** vellum-tinted (`THEME.vellum`) at `1.1` — bright enough that
  terrain and photos read clearly; the midnight mood comes from the palette,
  not from starving the light.
- **Key:** one warm low-sun point light (`THEME.sun`, `#f3e9c8`) raking from
  the upper right.
- **Fill:** a marsh-olive bounce (`THEME.olive`) from the far side, softer
  than the key so it reads as atmosphere, never a second sun.

### 4.2 Material language

| Element        | Material intent                                                  |
| -------------- | ---------------------------------------------------------------- |
| Sphere body    | Matte procedural terrain grain (`roughness 0.95`, `metalness 0`) — earth at night, not a balloon; bare, no grid overlay |
| Night sky      | Sparse static vellum stars on a distant shell, most faint with a few bright — open sky, never a planetarium; no twinkle, no motion |
| Tiles          | Flat, full-brightness thumbnails with a thin region-accent border plane |
| Region trails  | Dashed hairline route in the region accent at ~35% opacity, running just under the tiles — a surveyor's pencil line, never a glowing wire |
| Panels         | Solid near-opaque loam (`--panel-bg`), 1px iron-filings border, **no blur, no shadow** |

### 4.3 Flatness rules

- **No box-shadows anywhere.** Depth = contrast (lime on loam) + scale.
- **No backdrop blur.** Panels are near-opaque surfaces, like sheets laid on
  the terminal.
- Radius: `3.6px` (`--r-sm`) on buttons/tags/tooltips/inputs; `0`
  (`--r-md`) on panels, cards, and images. Never rounder.
- Images bleed clean: no border, no radius, no overlay (lightbox).

---

## 5. Spacing & layout

- **Spacing scale** (INVERSA): 5, 7, 14, 18, 21, 29, 59, 86 px
  (`--sp-1 … --sp-10`).
- **HUD layout:** wordmark top-left; a location label top-right (mono, lime
  dot) that quietly names the region in view and fades over open ground;
  editorial hero bottom-left; region-jump bar bottom-right (bottom-docked
  scroll row on mobile). The HUD floats directly on the scene — no nav
  background, no border.
- **Z-index ladder (single source of truth):**

  | Layer        | z-index | Contents                          |
  | ------------ | ------- | --------------------------------- |
  | Canvas       | 0       | The WebGL terrain sphere          |
  | Intro        | 10      | Hero name + traverse hint         |
  | HUD          | 15      | Top bar, region jump bar          |
  | Tooltip      | 20      | Hover label                       |
  | Panel        | 30      | Detail panel                      |
  | Modal        | 40      | Lightbox                          |

- Panels anchor right on desktop and become a bottom sheet on mobile (square
  corners — the sheet is an instrument tray, not a card).

---

## 6. Motion

Motion sells the *traverse* — and it must respect `prefers-reduced-motion`
(kills inertia, auto-spin, and turns fly-to/descend into instant cuts).

| Interaction        | Duration | Easing                          | Notes                                  |
| ------------------ | -------- | ------------------------------- | -------------------------------------- |
| Sphere drag        | realtime | direct + inertia (`0.92` decay) | The hero interaction                   |
| Drag speed         | —        | scales with altitude            | `k(altitude)`: 35% of orbit speed at the surface |
| Idle auto-rotate   | constant | linear, very slow (`~0.0008`)   | Orbit view only; off at the surface    |
| Fly-to-region + descend | 800ms | `cubic-bezier(.22,1,.36,1)`  | Region jump: rotate there *and* drop to surface |
| Return to orbit    | 800ms    | same                            | Ascend in place                        |
| Tile hover         | 200ms    | `ease-out`                      | Scale 1.08×, border up                 |
| Panel open/close   | 350ms    | `cubic-bezier(.22,1,.36,1)`     | Slide + fade                           |
| Tooltip            | 200ms    | `ease`                          | Fade only                              |
| Intro fade-out     | 800ms    | `ease`                          | On first drag or region jump           |

A user drag mid-flight always wins: the rotation animation is cancelled the
moment the sphere is grabbed (altitude continues — descending while dragging
is fine). See `docs/SURFACE_VIEW_PLAN.md` for the altitude model.

---

## 7. Iconography & badges

- The region-jump buttons carry a small **round** 7px swatch in the region
  hue — a quiet color cue, never a glow.
- Content-type badges on tiles (Phase 3): mono glyphs on a loam pill with a
  hairline border — `pdf` document glyph, `substack` ✍︎, `link` ↗.
- Keep icons line-weight, single-color, small. No filled/colored icons
  competing with the photos.

---

## 8. Accessibility (visual)

- **Contrast:** body text (`--text` on `--panel-bg`) meets WCAG AA. Lime on
  loam is ~15:1; ash (`--text-faint`) is reserved for non-essential metadata.
- **Color independence:** regions are distinguished by accent *and* position
  *and* label — never color alone.
- **Focus states:** keyboard focus gets a visible 2px `--accent` outline
  (`:focus-visible`), never removed.
- **Reduced motion:** honored everywhere (see §6).
- **Hit targets:** region-jump buttons and badges ≥ 44px effective tap area on
  touch (padding + gap).

---

## 9. Implementation note

These tokens belong in `:root` in `css/style.css` and (for the 3D side) in
`core/theme.js`, which exports the same hex values for Three.js materials and
lights — **one palette, two consumers**, never duplicated by hand. When a
color changes, it changes in both files in the same commit, and nowhere else.
Region hues additionally live in the manifest `color` field (content is data);
the three must stay in sync.
