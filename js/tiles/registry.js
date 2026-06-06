// Type registry: maps content type strings to handler objects.
// Each handler must export { buildThumb(data, r2base), open(data) }.
//
// Unknown types fall back to the placeholder handler so the globe never
// throws — it just shows a grey question-mark tile.

import { handler as imageHandler }       from './types/image.js';
import { handler as placeholderHandler } from './types/placeholder.js';

const registry = new Map([
  ['image', imageHandler],
]);

export function getHandler(type) {
  if (registry.has(type)) return registry.get(type);
  console.warn(`[tiles/registry] Unknown type "${type}" — using placeholder`);
  return placeholderHandler;
}

export function registerType(type, handler) {
  registry.set(type, handler);
}
