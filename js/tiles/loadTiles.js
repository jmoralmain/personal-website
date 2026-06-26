// Tile-layer orchestrator: loads content, places it, and builds the meshes.
//
// This lives in tiles/ (not content/) on purpose. Loading raw entries is a
// content concern (r2loader); scattering and mesh-building are tile concerns.
// Keeping the wiring here lets content/ stay dependency-free and keeps main.js
// to pure wiring.

import { loadFolderTiles }    from '../content/r2loader.js';
import { scatterTiles }       from './scatter.js';
import { buildTile }          from './Tile.js';
import { buildRoadNetwork }   from './path.js';
import { buildBlazes }        from './blaze.js';
import { buildRegionVisuals } from './regionVis.js';

// Returns a promise of { tiles, paths, visuals, blazes, setActiveBlaze }:
//   tiles   — built tile groups for all photos + pinned manifest tiles
//   paths   — the Survey Line: a globe-spanning dashed spine loop + region spurs
//             threading each region's photos
//   visuals — region territory caps + boundary rings (sized by photo count)
//   blazes  — the upright trail markers standing on the paths
//   setActiveBlaze — lights the blaze nearest a hovered photo (vellum → lime)
export async function loadRegionTiles(regions, pinnedTiles, regionMap) {
  const r2Folders = regions
    .filter(r => r.folder)
    .map(r => ({ region: r.id, folder: r.folder }));

  const folderTiles = await loadFolderTiles(r2Folders);
  const placed      = scatterTiles(folderTiles);

  // Count photos per region so regionVis can size territories proportionally.
  const regionCounts = {};
  for (const tile of [...pinnedTiles, ...placed]) {
    regionCounts[tile.region] = (regionCounts[tile.region] || 0) + 1;
  }

  const tiles   = [...pinnedTiles, ...placed]
    .map(data => buildTile(data, regionMap[data.region]?.color));
  const visuals = buildRegionVisuals(regionMap, regionCounts);

  // The trail network and its blazes are non-essential decoration: if either ever
  // throws, the photos and territories must still render.
  let paths = [];
  try {
    paths = buildRoadNetwork(placed, regionMap);
  } catch (err) {
    console.warn('[path] trail network failed to build, continuing without it:', err);
  }

  let blazes = [], setActiveBlaze = () => {};
  try {
    ({ meshes: blazes, setActiveBlaze } = buildBlazes(placed, regionMap));
  } catch (err) {
    console.warn('[blaze] trail markers failed to build, continuing without them:', err);
  }

  return { tiles, paths, visuals, blazes, setActiveBlaze };
}
