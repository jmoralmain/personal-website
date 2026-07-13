// Loads raw tile entries from repo index files + resolves asset URLs to R2.
//
// Index files (index.json) live in the repo under r2-indexes/<Folder>/, are
// auto-generated from the bucket by the "Refresh R2 photo index" Action, and
// are served as static files alongside the site. Only the actual photos and
// documents live in R2.
//
// This module is pure content loading: it returns un-positioned tile data.
// Placement (scatter) and mesh-building happen in the tiles/ layer
// (see tiles/loadTiles.js), so content/ depends on nothing in the project.

import { R2_BASE } from './manifest.js';

// Cache-busting tag appended to every photo URL. Cloudflare's edge cached the
// R2 objects WITHOUT an Access-Control-Allow-Origin header before the bucket's
// CORS policy existed; those stale responses make WebGL reject the textures
// (the image downloads HTTP 200 but can't be used cross-origin). Bumping this
// changes the URL, forcing a fresh fetch that re-caches a CORS-enabled
// response. Increment it any time CORS/edge-cache headers change.
const ASSET_VERSION = '2';

// regionFolders: array of { region, folder, type? }
// Example: { region: 'climbing', folder: 'Climbing' }
export async function loadFolderTiles(regionFolders) {
  const allTiles = [];

  await Promise.all(regionFolders.map(async ({ region, folder, type = 'image' }) => {
    const indexUrl = `${import.meta.url.replace(/\/js\/content\/r2loader\.js.*/, '')}/r2-indexes/${folder}/index.json`;

    let entries;
    try {
      const res = await fetch(indexUrl);
      if (!res.ok) {
        console.warn(
          `[r2loader] Could not load folder index for "${folder}" (HTTP ${res.status}). ` +
          `Make sure r2-indexes/${folder}/index.json exists in the repo. ` +
          `See docs/CONTENT_GUIDE.md for the index.json format.`,
        );
        return;
      }
      entries = await res.json();
    } catch (err) {
      console.error(
        `[r2loader] Failed to fetch or parse index for folder "${folder}". ` +
        `URL: ${indexUrl}. Error: ${err.message}`,
      );
      return;
    }

    if (!Array.isArray(entries)) {
      console.error(
        `[r2loader] index.json for "${folder}" must be a JSON array. Got: ${typeof entries}. ` +
        `Example format: [{ "file": "photo.jpg", "title": "My Photo", "caption": "..." }]`,
      );
      return;
    }

    entries.forEach((entry, i) => {
      if (!entry.file) {
        console.warn(`[r2loader] Entry ${i} in "${folder}/index.json" is missing "file" field — skipped.`);
        return;
      }
      // Filename stands in for a missing title, minus the extension and with
      // underscores as spaces — "Tahoe_Corniche.JPG" reads "Tahoe Corniche".
      const fallbackTitle = entry.file.replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
      const tile = {
        id:      `${region}-${entry.file.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
        type,
        region,
        label:   entry.title ?? fallbackTitle,
        title:   entry.title ?? fallbackTitle,
        icon:    entry.icon  ?? regionIcon(region),
        src:     `${R2_BASE}/${folder}/${encodeURIComponent(entry.file).replace(/%2B/gi, '+')}?v=${ASSET_VERSION}`,
        caption: entry.caption ?? '',
        body:    entry.body ?? '',
        preview: entry.preview ?? '',
      };
      // Honour an explicit pin if the entry has one; otherwise scatter places it.
      if (typeof entry.lat === 'number') tile.lat = entry.lat;
      if (typeof entry.lon === 'number') tile.lon = entry.lon;
      allTiles.push(tile);
    });
  }));

  // Raw, un-positioned entries. tiles/loadTiles.js scatters + builds them.
  return allTiles;
}

function regionIcon(region) {
  const icons = {
    climbing:     '🧗',
    landscape:    '🏔',
    music:        '🎵',
    portrait:     '📷',
    professional: '⚙️',
  };
  return icons[region] ?? '📌';
}
