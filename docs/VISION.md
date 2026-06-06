# Vision

> The north star. When a decision is unclear, it should be resolved in favour of
> what this document describes.

## The one-sentence pitch

A personal portfolio you **explore** rather than scroll — an interactive 3D
sphere you rotate with your mouse, where each region of the surface is a part of
my life, and the things floating on it (photos, essays, documents) open up when
you reach them.

## Why a sphere instead of a page

A traditional portfolio is a list. This is a *place*. The medium is the message:
exploration, curiosity, and the sense that there's always more just over the
horizon. The interaction itself — drag, discover, lean in — is part of the
personality I'm presenting.

## The five regions

The sphere is divided into five thematic regions. Each occupies a contiguous
patch of the surface so that "travelling" in a direction takes you deeper into
one theme. Regions are **data**, not hard-coded layout — adding a sixth must be
a config change, never a rebuild.

Beyond data, each region has a **visual identity**. A visitor should be able to
sense what part of the sphere they're in *before* they click anything — through
color, density, and the character of the tiles they see.

| Region           | Accent color | Tile density  | Visual character                                                   |
| ---------------- | ------------ | ------------- | ------------------------------------------------------------------ |
| Climbing         | `#ff8c42`    | Medium-high   | Wide landscape crops, portrait orientation shots; raw and physical |
| Family           | `#ff6fae`    | Medium        | Warm tones, candid moments; slightly softer glow than other regions|
| Friends          | `#7b61ff`    | Medium        | Candid, varied formats; livelier clustering than Family            |
| Portraits        | `#00d4ff`    | Low (curated) | High-res single-subject images; breathing room between tiles; minimal labels — let the photos speak |
| Data Engineering | `#4ade80`    | Low-medium    | Document covers, essay headers, diagrams; denser text badges       |

**What "visual identity" means in practice:**
- The border glow on every tile uses its region's accent color, so the sphere
  surface is color-coded without needing labels.
- Region center points carry a subtle ambient glow (a large, low-opacity
  `PointLight` tinted to the region color) so the sphere isn't uniformly lit.
- Portraits intentionally has more whitespace between tiles — density is part of
  the craft signal.
- Data Engineering tiles have a readable-text badge overlay on the thumbnail
  (essay title in small type) so the content type is obvious at a glance.

## What success looks like

**Immediate (first 10 seconds):**
A stranger lands, understands without being told that they should drag, spins
the globe at least once, and leans in toward something that catches their eye.
They have a feeling before they have a fact.

**Short term (first visit):**
They open at least one tile in a region they weren't looking for — serendipity,
not search. They leave with a sense of *who* the person is: not just a skills
list, but a life with texture.

**Long term (returning visitor):**
They come back because something new appeared. Adding a climbing trip or a new
essay should visibly change the world they remember.

**Author's measure:**
I can add a climbing trip's photos in under five minutes (manifest entries +
asset drop, nothing else). A Substack essay published today shows up here today.

## Core UX principles

1. **Navigation is the hero.** Dragging the sphere must feel weighty and smooth —
   inertia, gentle idle auto-rotation, no jank. If a feature hurts navigation
   feel, the feature loses.
2. **Content reveals progressively.** From far away you see *that* something is
   there (a tile, a glow). On hover you learn *what* it is (title / caption). On
   click you get the *full* thing (lightbox, reader, embed).
3. **One primitive, many contents.** Every piece of content is the same building
   block — a placeable 2-D plane ("tile") on the sphere — regardless of whether
   it shows a photo, a PDF, or an essay. See `ARCHITECTURE.md`.
4. **The world grows.** As content is added the sphere can grow in radius and
   density. It should never feel cramped and never require a layout rewrite.
5. **Authoring is data entry.** Adding content = adding an entry to a content
   manifest with a position. No one should touch render code to publish a photo.

## What success looks like

- A stranger lands, immediately understands they should drag, and spends more
  than a few seconds exploring out of genuine curiosity.
- I can add a climbing trip's worth of photos in a few minutes by editing a
  manifest, and they appear correctly clustered in the Climbing region.
- A Data Engineering essay published on Substack shows up here without me
  copy-pasting prose — just a reference.

## Explicit non-goals (for now)

- Not a CMS with an admin UI (manifest files are fine until they aren't).
- Not a blog engine — essays live on Substack; we *reference/embed* them.
- Not multiplayer, not VR. Mouse + touch on the open web.
