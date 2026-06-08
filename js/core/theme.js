// ─────────────────────────────────────────────────────────────────────────────
// THEME — the one place colors live for the Three.js (WebGL) side of the app.
//
// This mirrors the CSS custom properties in css/style.css. One palette, two
// consumers (CSS for DOM, this module for WebGL) — never hand-duplicate a hex.
// When a color changes, change it here AND in the matching :root token.
//
// The mood is OCEAN: lighter blue water (not turquoise), a textured "blue sand"
// globe surface, and WARM coral/sunset accents that pop against the cool water.
// ─────────────────────────────────────────────────────────────────────────────

export const THEME = {
  // Water — the environment. Lighter than the old space look, still calm.
  // The background gradients from a deeper blue at the poles to a brighter
  // mid-blue around the equator (set in CSS; these feed the WebGL fog/clear).
  water: {
    deep:    '#163a52',  // deep water, behind everything
    mid:     '#235d7d',  // mid water — main sphere body tone
    shallow: '#3a83a6',  // brighter shallows, catches the light
    foam:    '#bfe3ec',  // pale foam — wireframe grid, light specks
  },

  // Warm accents — sunset on water. Every region owns one warm hue so the
  // accents read as a single warm family against the blue, never a rainbow.
  regions: {
    climbing:     '#ff7a3d',  // coral-orange — rock at sunset
    landscape:    '#ffb151',  // warm amber — sand, dunes
    music:        '#ff5e7e',  // warm coral-pink — energy
    portrait:     '#ffd28a',  // soft gold — gentle, crafted
    professional: '#ff9166',  // terracotta — grounded, technical
  },

  // Neutral warm spine — used when no single region dominates (intro, glints).
  glint: '#ffe3c2',  // warm sun-on-water highlight
  hover: '#fff7ec',  // brighter warm — node hover highlight (distinct from glint)
};

// Convenience: hex string → integer for THREE.Color / material color fields.
export function hexInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}
