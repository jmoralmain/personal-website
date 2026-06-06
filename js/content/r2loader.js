// Loads tile entries from repo index files + resolves asset URLs against R2.
//
// Index files (_index.json) live in the repo under r2-indexes/<Folder>/
// and are served as static files alongside the site. Only the actual photos
// and documents live in R2.
//
// To add a photo: upload to R2, then add one line to the matching _index.json.

import { R2_BASE } from './manifest.js';
import { scatterTiles } from '../tiles/scatter.js';

// regionFolders: array of { region, folder, type? }
// Example: { region: 'climbing', folder: 'Climbing' }
export async function loadFolderTiles(regionFolders) {
  const allTiles = [];

  await Promise.all(regionFolders.map(async ({ region, folder, type = 'image' }) => {
    const indexUrl = `${import.meta.url.replace(/\/js\/content\/r2loader\.js.*/, '')}/r2-indexes/${folder}/_index.json`;

    let entries;
    try {
      const res = await fetch(indexUrl);
      if (!res.ok) {
        console.warn(
          `[r2loader] Could not load folder index for "${folder}" (HTTP ${res.status}). ` +
          `Make sure r2-indexes/${folder}/_index.json exists in the repo. ` +
          `See docs/CONTENT_GUIDE.md for the _index.json format.`,
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
        `[r2loader] _index.json for "${folder}" must be a JSON array. Got: ${typeof entries}. ` +
        `Example format: [{ "file": "photo.jpg", "title": "My Photo", "caption": "..." }]`,
      );
      return;
    }

    entries.forEach((entry, i) => {
      if (!entry.file) {
        console.warn(`[r2loader] Entry ${i} in "${folder}/_index.json" is missing "file" field — skipped.`);
        return;
      }
      allTiles.push({
        id:      `${region}-${entry.file.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
        type,
        region,
        // lat/lon intentionally omitted — scatter.js will place them
        label:   entry.title ?? entry.file,
        title:   entry.title ?? entry.file,
        icon:    entry.icon  ?? regionIcon(region),
        src:     `${R2_BASE}/${folder}/${encodeURIComponent(entry.file)}`,
        caption: entry.caption ?? '',
        body:    entry.body ?? '',
      });
    });
  }));

  // Assign positions to any tile without explicit lat/lon
  return scatterTiles(allTiles);
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
