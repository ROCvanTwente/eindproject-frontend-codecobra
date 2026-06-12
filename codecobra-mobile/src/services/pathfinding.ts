// Lightweight pathfinding service for the mobile app.
// Uses `pathfinding` if available; otherwise falls back to a simple straight-line interpolator
// `data/grid.json` is generated from the clean floor plan PNG by
// `scripts/generate-grid.cjs` (walkable = pixels of exactly RGB(231,231,233)),
// matching the walkability rule of the Pathfinding web prototype.

let PF: any = null;
try {
  // require at runtime so the package is optional during development
  // Install with: `npm install pathfinding` inside codecobra-mobile when ready
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  PF = require('pathfinding');
} catch (e) {
  // pathfinding not installed — we'll use fallback
  PF = null;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const gridData: number[][] = require('../data/grid.json');

const MAP_W_ORIG = 1531;
const MAP_H_ORIG = 704;

// Dilates walls by `radius` using a square neighborhood. The square (Chebyshev)
// dilation is separable: a horizontal pass followed by a vertical pass, each
// answering "is there any wall within `radius` along this axis?" via prefix
// sums. Output is identical to the naive per-wall block fill, but O(cells)
// instead of O(cells * radius^2).
export function padGrid(grid: number[][], radius = 10) {
  const h = grid.length;
  const w = grid[0].length;

  // Horizontal pass
  const horiz: number[][] = new Array(h);
  for (let y = 0; y < h; y++) {
    const row = grid[y];
    const prefix = new Array(w + 1);
    prefix[0] = 0;
    for (let x = 0; x < w; x++) prefix[x + 1] = prefix[x] + row[x];
    const out = new Array(w);
    for (let x = 0; x < w; x++) {
      const lo = Math.max(0, x - radius);
      const hi = Math.min(w - 1, x + radius);
      out[x] = prefix[hi + 1] - prefix[lo] > 0 ? 1 : 0;
    }
    horiz[y] = out;
  }

  // Vertical pass
  const result: number[][] = new Array(h);
  for (let y = 0; y < h; y++) result[y] = new Array(w);
  const colPrefix = new Array(h + 1);
  for (let x = 0; x < w; x++) {
    colPrefix[0] = 0;
    for (let y = 0; y < h; y++) colPrefix[y + 1] = colPrefix[y] + horiz[y][x];
    for (let y = 0; y < h; y++) {
      const lo = Math.max(0, y - radius);
      const hi = Math.min(h - 1, y + radius);
      result[y][x] = colPrefix[hi + 1] - colPrefix[lo] > 0 ? 1 : 0;
    }
  }
  return result;
}

// The padded grid never changes for a given radius, so compute it once and
// reuse it across route calculations. The PF.Grid itself cannot be cached:
// the finder mutates its nodes during a search, and constructing a fresh one
// from the cached matrix is cheaper than PF's grid.clone().
const paddedGridCache = new Map<number, number[][]>();

function getPaddedGrid(radius: number): number[][] {
  let padded = paddedGridCache.get(radius);
  if (!padded) {
    padded = radius > 0 ? padGrid(gridData, radius) : gridData;
    paddedGridCache.set(radius, padded);
  }
  return padded;
}

function mapToGridCoords(xMap: number, yMap: number, grid: number[][]) {
  const gx = Math.round((xMap / MAP_W_ORIG) * (grid[0].length - 1));
  const gy = Math.round((yMap / MAP_H_ORIG) * (grid.length - 1));
  return [gx, gy];
}

function gridToMapCoords(gx: number, gy: number, grid: number[][]) {
  const x = (gx / (grid[0].length - 1)) * MAP_W_ORIG;
  const y = (gy / (grid.length - 1)) * MAP_H_ORIG;
  return [x, y];
}

// Returns the walkable cell closest to (gx, gy), searching outward in
// expanding square rings. Stops and the user position sit on markers that may
// be a few pixels off the walkway; without snapping the search would start on
// a wall and find no path.
function snapToWalkable(grid: number[][], gx: number, gy: number, maxRadius = 60): [number, number] | null {
  const h = grid.length;
  const w = grid[0].length;
  if (grid[gy]?.[gx] === 0) return [gx, gy];
  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // ring only
        const x = gx + dx;
        const y = gy + dy;
        if (y >= 0 && y < h && x >= 0 && x < w && grid[y][x] === 0) return [x, y];
      }
    }
  }
  return null;
}

// Simple linear interpolation fallback (returns N points between start and end)
function straightLinePath(start: [number, number], end: [number, number], segments = 40) {
  const out: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    out.push([start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t]);
  }
  return out;
}

export function findPathOnMap(
  startMap: [number, number],
  endMap: [number, number],
  options?: { padding?: number },
): [number, number][] {
  if (!PF) {
    // pathfinding library not installed — return fallback straight line
    return straightLinePath(startMap, endMap, 40);
  }

  const padding = options?.padding ?? 0;
  const padded = getPaddedGrid(padding);
  const pfGrid = new PF.Grid(padded);
  const finder = new PF.DijkstraFinder({ allowDiagonal: true, dontCrossCorners: true });

  const [sx, sy] = mapToGridCoords(startMap[0], startMap[1], padded);
  const [ex, ey] = mapToGridCoords(endMap[0], endMap[1], padded);

  const start = snapToWalkable(padded, sx, sy);
  const end = snapToWalkable(padded, ex, ey);
  if (!start || !end) return [];

  const rawPath = finder.findPath(start[0], start[1], end[0], end[1], pfGrid) as [number, number][];
  if (!rawPath || rawPath.length === 0) return [];

  // map back to original map coordinates
  return rawPath.map(([gx, gy]: [number, number]) => gridToMapCoords(gx, gy, padded) as [number, number]);
}

export function getGridDimensions() {
  return { cols: gridData[0].length, rows: gridData.length };
}
