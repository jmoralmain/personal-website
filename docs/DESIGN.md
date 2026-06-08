# Design System

The visual language of the portfolio. Where `VISION.md` says *what it should
feel like*, this says *exactly which colors, type, spacing, and motion deliver
that feeling*. These are the tokens code references — no hard-coded hex, no
one-off font sizes.

---

## 1. Design principles

1. **The content is the color.** The UI itself is near-monochrome ocean blue.
   Color comes from the photos and the warm region accents — chrome never
   competes with content.
2. **Open water, light and calm.** This is an *ocean* environment, not space:
   lighter mid-blue water (never turquoise), a textured "blue sand" globe
   surface. Backgrounds recede into deeper water; tiles and warm light glow
   forward. The mood is a crossing at golden hour, not a night sky.
3. **Glow, not borders.** Depth and focus are signalled with soft luminance
   (halos, gradients, foam), not hard 1px lines. The sphere is lit, not drawn.
4. **One accent at a time.** Any given moment is dominated by one region's warm
   accent (the region you're looking at), with the warm sun-on-water spine as the
   neutral. All accents are warm — they read as one family against the cool
   water, never a rainbow.
5. **Restraint scales.** Five regions × hundreds of tiles will get busy. The
   system stays calm by limiting the palette and keeping type to two roles.

---

## 2. Color

### 2.1 Foundation (ocean) palette

The environment. These are the CSS tokens (`css/style.css` `:root`) and their
WebGL twins (`js/core/theme.js` `THEME.water`) — **one palette, two consumers**.

| Token            | Hex        | Role                                            |
| ---------------- | ---------- | ----------------------------------------------- |
| `--water-deep`   | `#163a52`  | Deep water — edges of the background gradient   |
| `--water-mid`    | `#235d7d`  | Mid water — sphere body tone, background middle |
| `--water-shallow`| `#3a83a6`  | Bright shallows — centre of the gradient        |
| `--water-foam`   | `#bfe3ec`  | Pale foam — wireframe grid, light glints        |
| `--bg`           | `#1b4762`  | Base water tone (token required by verify)      |
| `--bg-raise`     | `#235d7d`  | Raised surfaces                                 |
| `--panel-bg`     | `#123042` @ 88% | Glass panels (with blur)                   |
| `--text`         | `#f2f6f7`  | Primary text (near-white, slightly cool)        |
| `--text-dim`     | `#f2f6f7` @ 70% | Secondary text, captions                   |
| `--text-faint`   | `#f2f6f7` @ 45% | Hints, metadata, disabled                  |
| `--line`         | `#bfe3ec` @ 18% | Wireframe, hairlines, subtle dividers      |

The page background is a **radial gradient** (`--water-shallow` centre →
`--water-mid` → `--water-deep` edge), like looking down into open water. The
WebGL canvas is alpha-transparent so this shows through behind the globe.

### 2.2 Brand spine

The warm "sun on water" accents that define the brand when no single region
dominates (intro screen, neutral UI, gradients).

| Token        | Hex        | Role                                       |
| ------------ | ---------- | ------------------------------------------ |
| `--accent`   | `#ff8a4c`  | Primary warm coral-orange                  |
| `--accent-2` | `#ffd28a`  | Secondary warm gold                        |

The signature gradient is `linear-gradient(135deg, #ff8a4c, #ffd28a)` — used on
the name wordmark, panel titles, and focus highlights. `THEME.glint` (`#ffe3c2`)
is the warm highlight used for foam/glints and as the neutral marker color.

### 2.3 Region accents

Each region owns one **warm** accent (these match `js/core/theme.js`
`THEME.regions` and the manifest `color` field). They tint tile borders, region
ambient light, and the active-region UI.

| Region           | Token                  | Hex        | Character                    |
| ---------------- | ---------------------- | ---------- | ---------------------------- |
| Climbing         | `--region-climbing`    | `#ff7a3d`  | Coral-orange — rock, sunset  |
| Landscape        | `--region-landscape`   | `#ffb151`  | Warm amber — sand, dunes     |
| Music            | `--region-music`       | `#ff5e7e`  | Warm coral-pink — energy     |
| Portrait         | `--region-portrait`    | `#ffd28a`  | Soft gold — gentle, crafted  |
| Professional     | `--region-professional`| `#ff9166`  | Terracotta — grounded, tech  |

> All five accents are warm by design, so against the cool blue water they read
> as one sunset family rather than a random rainbow. Wayfinding comes from
> **position** (where the region sits on the globe) and **label**, not hue alone.

### 2.4 Semantic / state colors

| Token         | Hex        | Role                                  |
| ------------- | ---------- | ------------------------------------- |
| `--warn`      | `#ffb84d`  | Missing-asset placeholder border, soft warnings |
| `--error`     | `#ff5d5d`  | Hard manifest errors (dev-facing)     |
| `--hover`     | `--accent-2` | Tile/node hover highlight           |

### 2.5 Color usage rules

- **60 / 30 / 10:** ~60% space (background), ~30% content (photos/tiles),
  ~10% accent (glows, active UI). Accent is a seasoning, not a base.
- Never place two region accents adjacent in chrome — the active region's accent
  is the only accent in the UI at any time.
- Text on glass panels is always `--text` / `--text-dim`; never a region accent
  (accents are for glow and structure, not body copy — they fail contrast).
- The intro/neutral state uses the brand spine gradient; entering a region shifts
  ambient light toward that region's accent.

---

## 3. Typography

### 3.1 Type families

| Role         | Family                                              | Rationale                       |
| ------------ | -------------------------------------------------- | ------------------------------- |
| Display / UI | `Inter`, then system (`system-ui, Segoe UI, sans`) | Clean, neutral, lets photos lead |
| Mono / data  | `JetBrains Mono`, then `ui-monospace, monospace`    | Data Engineering badges, code, captions with a technical flavor |

Two families, two jobs. No third font. Load Inter via the same CDN approach as
Three.js (or `font-display: swap` self-hosted at the build-step stage).

### 3.2 Type scale

A modular scale (ratio ~1.25). Reference these as tokens, not raw values.

| Token        | Size (clamp)                          | Use                        |
| ------------ | ------------------------------------- | -------------------------- |
| `--fs-hero`  | `clamp(2rem, 6vw, 4.5rem)`            | Name wordmark (intro)      |
| `--fs-h2`    | `clamp(1.3rem, 2.5vw, 1.6rem)`        | Panel titles               |
| `--fs-body`  | `0.95rem`                             | Panel body, captions       |
| `--fs-label` | `0.8rem`                              | Tooltips, tile labels      |
| `--fs-meta`  | `0.7rem` (uppercase, letter-spaced)   | Region tags, metadata      |

### 3.3 Type rules

- **Weights:** 700 for display, 600 for titles, 400 for body, 500 for labels.
  Avoid going below 400 on dark backgrounds — thin weights shimmer and lose legibility.
- **Letter-spacing:** slightly loose on uppercase meta (`0.08–0.15em`); normal
  on body. The hero wordmark gets `0.04em`.
- **Line-height:** 1.6 for body copy (breathing room on dark), 1.1 for display.
- **Color:** gradient fill only on the hero wordmark and panel titles; everything
  else is solid `--text` / `--text-dim`.

---

## 4. Depth, light & material

The 3D scene *is* the design — these rules keep it coherent with the 2-D UI.

### 4.1 Lighting

- **Ambient:** brighter (`~0.7`) cool foam-white — keeps the water light, never
  murky.
- **Key lights:** two warm point lights, coral (`THEME.regions.climbing`) and
  gold (`THEME.glint`), on opposite sides — opposite faces of the globe catch a
  slightly different warm tone, giving a sunset gradient across the surface.
- **Region ambient:** when the camera faces a region, a large, low-opacity point
  light tinted to that region's accent warms that part of the globe (`VISION.md`).

### 4.2 Material language

| Element        | Material intent                                                  |
| -------------- | --------------------------------------------------------------- |
| Sphere body    | Matte textured "blue sand" (`roughness 0.95`, `metalness 0`, procedural grain map) — tactile water surface, not a shiny balloon |
| Wireframe shell| Foam-white at ~12% opacity, gently shimmering — water grid, not a cage |
| Tiles          | Flat, full-brightness thumbnails with a soft warm region-accent glow border |
| Glass panels   | `backdrop-filter: blur(18px)` over `--panel-bg` @ 88% — frosted, floats above scene |
| Glints         | Tiny warm points (`THEME.glint`), size-attenuated — distant sun-on-water haze |

### 4.3 Glow / shadow

- Glows are colored, soft, and low-opacity — never a hard outline. Tile hover
  glow = region accent at increasing opacity (40% → 100%).
- Panel shadow: large, soft, near-black (`0 20px 60px rgba(0,0,0,0.5)`) to lift
  glass off the scene.
- No pure-black hard drop shadows on small UI; they look pasted-on against space.

---

## 5. Spacing & layout

- **Base unit: 4px.** All spacing is a multiple (4, 8, 12, 16, 24, 32, 48).
- **Panel padding:** 32px desktop, 20px mobile.
- **Radius scale:** `8px` small (buttons/badges), `16px` panels, `20px+` pills
  (tooltips). Generous radii read as soft/friendly, fitting the playful concept.
- **Z-index ladder (single source of truth):**

  | Layer        | z-index | Contents                         |
  | ------------ | ------- | -------------------------------- |
  | Canvas       | 0       | The WebGL sphere                 |
  | Intro        | 10      | Name + "drag to explore" overlay |
  | Tooltip      | 20      | Hover label                      |
  | Panel        | 30      | Lightbox / reader / detail panel |
  | Modal/dialog | 40      | Future full-screen states        |

- Panels anchor right on desktop (sphere stays visible, centered-left), and slide
  up from the bottom as a sheet on mobile.

---

## 6. Motion

Motion sells the "place" — but it must respect `prefers-reduced-motion` (kills
inertia, auto-spin, and large transitions; instant states only).

| Interaction        | Duration | Easing                          | Notes                       |
| ------------------ | -------- | ------------------------------- | --------------------------- |
| Sphere drag        | realtime | direct + inertia (`0.92` decay) | The hero interaction        |
| Idle auto-rotate   | constant | linear, very slow (`~0.0008`)   | Only when truly idle        |
| Tile hover         | 200ms    | `ease-out`                      | Scale 1.08×, glow up        |
| Panel open/close   | 350ms    | `cubic-bezier(.22,1,.36,1)`     | Slide + fade                |
| Tooltip            | 200ms    | `ease`                          | Fade only                   |
| Intro fade-out     | 800ms    | `ease`                          | On first drag               |
| Fly-to-region      | 800ms    | `cubic-bezier(.22,1,.36,1)`     | Camera orbit (Phase 4)      |

**Motion principles:** ease-out for things entering (fast then settle), the
custom `cubic-bezier(.22,1,.36,1)` for panels/camera (snappy with a soft
landing), nothing linear except the idle spin. Never animate more than ~3 things
at once — calm, not busy.

---

## 7. Iconography & badges

- Content-type badges sit on tiles to signal what opens on click:
  - `image` — no badge (the default; the photo speaks)
  - `pdf` — document glyph, bottom-right, on a dark pill
  - `substack` — ✍︎ writing glyph
  - `link` — ↗ external glyph
- Badges use `--text` on a `rgba(0,0,0,0.6)` pill so they read on any thumbnail.
- Keep icons line-weight, single-color, small (`--fs-meta`). No filled/colored
  icons competing with the photos.

---

## 8. Accessibility (visual)

- **Contrast:** body text (`--text` on `--panel-bg`) must meet WCAG AA (≥ 4.5:1).
  Region accents are decorative — never the sole carrier of meaning or used for
  body text.
- **Color independence:** regions are distinguished by accent *and* position *and*
  label — never color alone (colorblind-safe). The amber/rose/violet/cyan/green
  set was chosen for hue separation, but position is the real wayfinding.
- **Focus states:** keyboard focus gets a visible 2px `--accent-2` ring, never
  removed.
- **Reduced motion:** honored everywhere (see §6).
- **Hit targets:** interactive tiles/badges ≥ 44px effective tap area on touch.

---

## 9. Implementation note

These tokens belong in `:root` in `css/style.css` and (for the 3D side) in a
small `core/theme.js` that exports the same hex values for Three.js materials and
lights — **one palette, two consumers**, never duplicated by hand. When a color
changes, it changes in one place. This mirrors the "data over code" rule in
`CLEAN_CODE.md`: the palette is data.
