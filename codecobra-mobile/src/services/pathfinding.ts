// Lightweight pathfinding service for the mobile app.
// Uses `pathfinding` if available; otherwise falls back to a simple straight-line interpolator
// Replace `data/grid.json` with your real exported grid (recommended from the prototype).

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

function cloneGrid(grid: number[][]) {
  return grid.map((r) => r.slice());
}

export function padGrid(grid: number[][], radius = 10) {
  const h = grid.length;
  const w = grid[0].length;
  const out = cloneGrid(grid);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] === 1) {
        for (let ny = Math.max(0, y - radius); ny <= Math.min(h - 1, y + radius); ny++) {
          for (let nx = Math.max(0, x - radius); nx <= Math.min(w - 1, x + radius); nx++) {
            out[ny][nx] = 1;
          }
        }
      }
    }
  }
  return out;
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
  const baseGrid = gridData;
  const padded = options?.padding ? padGrid(baseGrid, options.padding) : baseGrid;

  if (!PF) {
    // pathfinding library not installed — return fallback straight line
    return straightLinePath(startMap, endMap, 40);
  }

  const pfGrid = new PF.Grid(padded);
  const finder = new PF.DijkstraFinder({ allowDiagonal: true, dontCrossCorners: true });

  const [sx, sy] = mapToGridCoords(startMap[0], startMap[1], padded);
  const [ex, ey] = mapToGridCoords(endMap[0], endMap[1], padded);

  const rawPath = finder.findPath(sx, sy, ex, ey, pfGrid) as [number, number][];
  if (!rawPath || rawPath.length === 0) return [];

  // map back to original map coordinates
  return rawPath.map(([gx, gy]: [number, number]) => gridToMapCoords(gx, gy, padded) as [number, number]);
}

export function getGridDimensions() {
  return { cols: gridData[0].length, rows: gridData.length };
}
