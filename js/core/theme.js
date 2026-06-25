// ─────────────────────────────────────────────────────────────────────────────
// THEME — the one place colors live for the Three.js (WebGL) side of the app.
//
// This mirrors the CSS custom properties in css/style.css. One palette, two
// consumers (CSS for DOM, this module for WebGL) — never hand-duplicate a hex.
// When a color changes, change it here AND in the matching :root token.
//
// The mood is a WHITE STUDIO: a dark earth globe suspended in a soft, near-white
// cyclorama — a quiet gallery room, brightest just behind the sphere, fading to
// a faintly warm floor it appears to float above. The globe is the one dark
// object; the room is airy and dimensional, never a flat backdrop. Flat,
// shadowless chrome, calm — never tactical.
// ─────────────────────────────────────────────────────────────────────────────

export const THEME = {
  // Surfaces & strokes — the instrument panel.
  canvas: '#13140e',  // obsidian loam — near-black with an olive cast, never #000
  vellum: '#f4f3e8',  // bone vellum — warm paper white for text/strokes
  ash:    '#84837b',  // drift ash — muted secondary labels
  line:   '#404040',  // iron filings — hairline borders

  // THE accent. One chromatic note: the survey marker.
  lime:   '#ebfc72',  // lime surveyor — active states, markers, emphasis
  olive:  '#bacd31',  // marsh olive — deeper stop for lime fades

  // Terrain — the earth surface you traverse. Naturalistic, never neon.
  // Kept dark on purpose: against the white studio it reads as one solid dark
  // object floating in the room, not a void.
  terrain: {
    low:  '#2a3120',  // shadowed valleys
    base: '#3a4529',  // moss ground — main globe tone
    mid:  '#55663b',  // vegetated mid-tones
    high: '#79904f',  // lit ridgelines
  },

  // Studio light rig — a soft warm key + a neutral room bounce, the way an
  // object sits in a white photographic cove. No saturated sky tint: the blue
  // fill is gone with the blue sky. No CSS counterparts; 3D scene only.
  key:  '#fff4e8',  // soft warm-white key — gentle form, not a golden sun
  fill: '#eef0f3',  // neutral cool-white room bounce — fills the shadow side

  // Region accents — a quiet naturalistic family (earth, vegetation, water).
  // Deliberately muted so the lime survey marker stays the loudest thing on
  // screen. Must match the :root --region-* tokens and manifest REGIONS[].color.
  regions: {
    climbing:     '#d4622e',  // terracotta
    landscape:    '#3a9e52',  // forest green
    music:        '#7844c0',  // violet
    portrait:     '#d08a14',  // amber
    professional: '#2a85b0',  // ocean teal
  },

  // Fallback marker color when no region is known — the survey marker itself.
  glint: '#ebfc72',
  hover: '#f4f3e8',  // hover highlight — vellum, distinct from the lime accent

  // The trail/road that connects content across the globe. Dark asphalt, opaque,
  // so it reads as a real road against the bright territory caps; its white
  // edge/center lines (THEME.vellum) carry the road's shape. 3D scene only.
  road: '#33332f',
};

// Convenience: hex string → integer for THREE.Color / material color fields.
export function hexInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}
