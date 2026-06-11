// Tile-layer orchestrator: loads content, places it, and builds the meshes.
//
// This lives in tiles/ (not content/) on purpose. Loading raw entries is a
// content concern (r2loader); scattering and mesh-building are tile concerns.
// Keeping the wiring here lets content/ stay dependency-free and keeps main.js
// to pure wiring.

import { loadFolderTiles }  from '../content/r2loader.js';
import { scatterTiles }     from './scatter.js';
import { buildTile }        from './Tile.js';
import { buildRegionPaths } from './path.js';

// Returns a promise of { tiles, paths }: built tile groups (the pinned
// manifest tiles plus every photo found in the R2 folders, each placed along
// its region's trail) and one dashed trail line per region connecting them.
export async function loadRegionTiles(regions, pinnedTiles, regionMap) {
  const r2Folders = regions
    .filter(r => r.folder)
    .map(r => ({ region: r.id, folder: r.folder }));

  const folderTiles = await loadFolderTiles(r2Folders);  // raw, un-positioned
  const placed      = scatterTiles(folderTiles);         // assigns lat/lon + trail order

  const tiles = [...pinnedTiles, ...placed]
    .map(data => buildTile(data, regionMap[data.region]?.color));
  const paths = buildRegionPaths(placed, regionMap);

  return { tiles, paths };
}
