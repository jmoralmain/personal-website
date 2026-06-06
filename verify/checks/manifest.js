import { REGIONS, NODES } from '../../js/content/manifest.js';

export const name = 'Content manifest (manifest.js)';

// Field rules — mirrors the validation table in ARCHITECTURE.md §3.0.
// severity 'error'  → tile is skipped entirely (hard failure)
// severity 'warn'   → tile renders as placeholder (soft failure)
const NODE_RULES = [
  {
    field: 'id', severity: 'error',
    test: (v) => typeof v === 'string' && v.length > 0 && !/\s/.test(v),
    why:  'id is the unique key used for deep-links and deduplication. ' +
          'Spaces break URL params. Missing id means the entry is unaddressable.',
  },
  {
    field: 'region', severity: 'error',
    test: (v, _node, ctx) => ctx.regionIds.has(v),
    why:  'region must match a REGIONS[].id. A mismatch means regionMap lookup ' +
          'returns undefined, the node gets the fallback color #7b61ff, and it ' +
          'may be placed in the wrong area of the sphere.',
  },
  {
    field: 'lat', severity: 'error',
    test: (v) => typeof v === 'number' && v >= -90 && v <= 90,
    why:  'lat out of range causes latLonToVec3 to produce a point off the sphere ' +
          'surface. Node will appear at a wrong 3D position or behind the globe.',
  },
  {
    field: 'lon', severity: 'error',
    test: (v) => typeof v === 'number' && v >= -180 && v <= 180,
    why:  'lon out of range has the same effect as lat — wrong 3D placement.',
  },
  {
    field: 'label', severity: 'error',
    test: (v) => typeof v === 'string' && v.length > 0,
    why:  'label is what appears in the hover tooltip. An empty string shows a ' +
          'blank tooltip; a missing label throws when tooltip.js calls textContent.',
  },
  {
    field: 'title', severity: 'error',
    test: (v) => typeof v === 'string' && v.length > 0,
    why:  'title is shown as the panel heading. Missing title passes undefined to ' +
          'panel.js which renders "undefined" as visible text.',
  },
  {
    field: 'icon', severity: 'warn',
    test: (v) => typeof v === 'string' && v.length > 0,
    why:  'icon is shown in the panel. Omitting it leaves the icon slot empty ' +
          '(acceptable for Portraits, odd for other regions).',
  },
  {
    field: 'body', severity: 'warn',
    test: (v) => typeof v === 'string',
    why:  'body is the panel description. Omitting it shows no text in the panel ' +
          '(valid for image-only tiles; confirm this is intentional).',
  },
];

const REGION_RULES = [
  {
    field: 'id', severity: 'error',
    test: (v) => typeof v === 'string' && v.length > 0 && !/\s/.test(v),
    why:  'region id is used as the key in regionMap. Spaces break the lookup.',
  },
  {
    field: 'label', severity: 'error',
    test: (v) => typeof v === 'string' && v.length > 0,
    why:  'label is displayed in the UI as the region name.',
  },
  {
    field: 'color', severity: 'error',
    test: (v) => /^#[0-9a-fA-F]{6}$/.test(v),
    why:  'color is parsed with parseInt(color.replace("#",""), 16) in nodes.js. ' +
          'A non-hex-6 string produces NaN, which Three.js renders as black.',
  },
  {
    field: 'center', severity: 'error',
    test: (v) => v && typeof v.lat === 'number' && typeof v.lon === 'number',
    why:  'center is used by the auto-scatter helper (Phase 2) and the fly-to-region ' +
          'camera animation (Phase 4). Missing center will throw at those call sites.',
  },
  {
    field: 'spread', severity: 'warn',
    test: (v) => typeof v === 'number' && v > 0,
    why:  'spread defines the region\'s angular radius for auto-scattering tiles. ' +
          'Omitting it will cause auto-scatter to use a default or throw.',
  },
];

export function run() {
  const results = [];
  const regionIds = new Set(REGIONS.map(r => r.id));
  const ctx = { regionIds };

  // ── Structural exports ────────────────────────────────────────────────────
  results.push(check(
    'REGIONS is exported as a non-empty array',
    Array.isArray(REGIONS) && REGIONS.length > 0,
    `Got: ${JSON.stringify(REGIONS)}. manifest.js must export REGIONS as an array. ` +
    `An empty array means no regions — nothing will render on the sphere.`,
  ));
  results.push(check(
    'NODES is exported as an array',
    Array.isArray(NODES),
    `Got: ${JSON.stringify(NODES)}. manifest.js must export NODES as an array ` +
    `(empty is valid but means nothing appears on the globe).`,
  ));

  if (!Array.isArray(REGIONS) || !Array.isArray(NODES)) return results;

  // ── Validate each region ──────────────────────────────────────────────────
  const seenRegionIds = new Set();
  REGIONS.forEach((region, i) => {
    const prefix = `REGIONS[${i}] id="${region.id ?? '?'}"`;
    REGION_RULES.forEach(rule => {
      const val = region[rule.field];
      if (!rule.test(val, region, ctx)) {
        results.push({
          label:    `${prefix}: field "${rule.field}" invalid`,
          passed:   false,
          severity: rule.severity,
          detail:   `Value: ${JSON.stringify(val)}. Why this matters: ${rule.why}`,
        });
      }
    });
    if (region.id) {
      results.push(check(
        `${prefix}: id is unique`,
        !seenRegionIds.has(region.id),
        `Duplicate region id "${region.id}" at index ${i}. ` +
        `regionMap is built with Object.fromEntries — a duplicate silently overwrites ` +
        `the earlier region, so one region's nodes will use the wrong color.`,
      ));
      seenRegionIds.add(region.id);
    }
  });

  // ── Validate each node ────────────────────────────────────────────────────
  const seenNodeIds = new Set();
  NODES.forEach((node, i) => {
    const prefix = `NODES[${i}] id="${node.id ?? '?'}"`;
    NODE_RULES.forEach(rule => {
      const val = node[rule.field];
      if (!rule.test(val, node, ctx)) {
        results.push({
          label:    `${prefix}: field "${rule.field}" invalid`,
          passed:   false,
          severity: rule.severity,
          detail:   `Value: ${JSON.stringify(val)}. Why this matters: ${rule.why}`,
        });
      }
    });
    if (node.id) {
      results.push(check(
        `${prefix}: id is unique`,
        !seenNodeIds.has(node.id),
        `Duplicate node id "${node.id}". Deep-links (?tile=${node.id}) would resolve ` +
        `ambiguously. Object identity in picker.js uses the mesh reference, not the id, ` +
        `so interaction still works — but analytics and shareability break.`,
      ));
      seenNodeIds.add(node.id);
    }
  });

  // ── Cross-checks ──────────────────────────────────────────────────────────
  const orphanRegions = REGIONS.filter(r => !NODES.some(n => n.region === r.id));
  results.push(check(
    'Every REGION has at least one node referencing it',
    orphanRegions.length === 0,
    `Regions with no nodes: ${orphanRegions.map(r => `"${r.id}"`).join(', ')}. ` +
    `These regions exist in the manifest but are invisible on the globe. ` +
    `Either add nodes or remove the region entry.`,
  ));

  const orphanNodes = NODES.filter(n => !regionIds.has(n.region));
  results.push(check(
    'Every NODE references an existing region',
    orphanNodes.length === 0,
    `Nodes with unknown region: ${orphanNodes.map(n => `"${n.id}" (region="${n.region}")`).join(', ')}. ` +
    `These nodes will be colored #7b61ff (fallback) regardless of their region value.`,
  ));

  return results;
}

function check(label, passed, failDetail) {
  return { label, passed, severity: 'error', detail: passed ? null : failDetail };
}
