// Region jump bar — one button per region, generated from the manifest so
// adding a region to REGIONS makes a jump button appear with no code changes.
// Also owns the "return to orbit" button and the body-level surface/orbit
// mode class that CSS uses to reveal it.

const navEl    = document.getElementById('region-nav');
const orbitBtn = document.getElementById('orbit-btn');

// onJump(regionId) and onOrbit() are wired by main.js.
export function attachRegionNav(regions, { onJump, onOrbit }) {
  const buttons = new Map();

  regions.forEach(region => {
    const btn = document.createElement('button');
    btn.className = 'region-jump';
    btn.style.setProperty('--swatch', `var(--region-${region.id})`);
    btn.setAttribute('aria-pressed', 'false');

    btn.append(document.createTextNode(region.label));

    btn.addEventListener('click', () => {
      setActive(region.id);
      onJump(region.id);
    });

    navEl.appendChild(btn);
    buttons.set(region.id, btn);
  });

  orbitBtn.addEventListener('click', () => {
    setActive(null);
    onOrbit();
  });

  // Highlights one region's button (or none, when id is null — e.g. the user
  // dragged away from where they jumped to).
  function setActive(id) {
    buttons.forEach((btn, regionId) => {
      const active = regionId === id;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  // Called by flyTo when crossing between orbit and surface altitude;
  // CSS shows the "return to orbit" button only when body has .at-surface.
  function setMode(atSurface) {
    document.body.classList.toggle('at-surface', atSurface);
  }

  return { setActive, setMode };
}
