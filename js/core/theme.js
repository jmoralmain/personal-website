// ─────────────────────────────────────────────────────────────────────────────
// THEME — the one place colors live for the Three.js (WebGL) side of the app.
//
// This mirrors the CSS custom properties in css/style.css. One palette, two
// consumers (CSS for DOM, this module for WebGL) — never hand-duplicate a hex.
// When a color changes, change it here AND in the matching :root token.
//
// The mood is a TOPOGRAPHIC FIELD TERMINAL AT MIDNIGHT: you hover just above
// a dark earth surface and traverse it. Near-black olive canvas, warm
// paper-white text, a single electric-lime survey marker, and naturalistic
// terrain tones on the globe itself. Flat, shadowless, instrument-panel.
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
  terrain: {
    low:  '#181c12',  // shadowed valleys
    base: '#232a1b',  // dark moss ground — main globe tone
    mid:  '#37422a',  // vegetated mid-tones
    high: '#55633a',  // lit ridgelines
  },

  // Light rig — low warm sun + faint olive bounce (see core/sceneSetup.js).
  sun:  '#f3e9c8',

  // Region accents — a quiet naturalistic family (earth, vegetation, water).
  // Deliberately muted so the lime survey marker stays the loudest thing on
  // screen. Must match the :root --region-* tokens and manifest REGIONS[].color.
  regions: {
    climbing:     '#d98e62',  // canyon clay
    landscape:    '#a8bf7a',  // sage green
    music:        '#c98a93',  // dust rose
    portrait:     '#e6d8ab',  // bone gold
    professional: '#7fa9b8',  // slate water
  },

  // Fallback marker color when no region is known — the survey marker itself.
  glint: '#ebfc72',
  hover: '#f4f3e8',  // hover highlight — vellum, distinct from the lime accent
};

// Convenience: hex string → integer for THREE.Color / material color fields.
export function hexInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}
