// ─────────────────────────────────────────────────────────────────────────────
// THEME — the one place colors live for the Three.js (WebGL) side of the app.
//
// This mirrors the CSS custom properties in css/style.css. One palette, two
// consumers (CSS for DOM, this module for WebGL) — never hand-duplicate a hex.
// When a color changes, change it here AND in the matching :root token.
//
// The mood is a GOLDEN HOUR ATLAS: a dark earth globe seen from low altitude,
// suspended in a warm sunset sky — deep violet zenith fading through burnt
// coral to gold at the horizon. Flat, shadowless, calm — never tactical.
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
  // Lifted well clear of the obsidian canvas so the ground reads as a lit
  // surface at golden hour, not a void.
  terrain: {
    low:  '#2a3120',  // shadowed valleys
    base: '#3a4529',  // moss ground — main globe tone
    mid:  '#55663b',  // vegetated mid-tones
    high: '#79904f',  // lit ridgelines
  },

  // Light rig — golden-hour sun + warm violet atmospheric bounce.
  // No CSS counterparts; these are 3D scene colors only.
  sun:  '#ff9933',  // golden amber — saturated low sun at golden hour
  dusk: '#b05878',  // warm rose-violet — atmospheric bounce from the sunset sky

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
