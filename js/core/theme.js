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

  // Light rig — warm sun + soft sky-blue atmospheric bounce.
  // No CSS counterparts; these are 3D scene colors only.
  sun:  '#ffc060',  // warm golden — gentle afternoon sun, not the sharp orange of sunset
  dusk: '#5888c8',  // sky blue — atmospheric fill bounce from the open sky

  // Region accents — a quiet naturalistic family (earth, vegetation, water).
  // Deliberately muted so the lime survey marker stays the loudest thing on
  // screen. Must match the :root --region-* tokens and manifest REGIONS[].color.
  regions: {
    climbing:     '#c48468',  // dusty clay
    landscape:    '#7aaa7e',  // soft moss
    music:        '#9e82ba',  // quiet lavender
    portrait:     '#c4a46c',  // honeyed sand
    professional: '#6aa0b4',  // hazy teal
  },

  // Fallback marker color when no region is known — the survey marker itself.
  glint: '#ebfc72',
  hover: '#f4f3e8',  // hover highlight — vellum, distinct from the lime accent
};

// Convenience: hex string → integer for THREE.Color / material color fields.
export function hexInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}
