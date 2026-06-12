// Pathfinding service using the `pathfinding` npm package with A* and path smoothing.
// Grid is pre-exported as grid.json (0 = walkable, 1 = wall).

let PF: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  PF = require('pathfinding');
} catch (e) {
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

// Downsample grid by taking every `stride`-th cell (faster pathfinding on large grids)
function downsampleGrid(grid: number[][], stride: number): number[][] {
  const result: number[][] = [];
  for (let y = 0; y < grid.length; y += stride) {
    const row: number[] = [];
    for (let x = 0; x < grid[0].length; x += stride) {
      // Mark as wall if any cell in the stride block is a wall
      let isWall = false;
      for (let dy = 0; dy < stride && y + dy < grid.length; dy++) {
        for (let dx = 0; dx < stride && x + dx < grid[0].length; dx++) {
          if (grid[y + dy][x + dx] === 1) { isWall = true; break; }
        }
        if (isWall) break;
      }
      row.push(isWall ? 1 : 0);
    }
    result.push(row);
  }
  return result;
}

function mapToGridCoords(xMap: number, yMap: number, grid: number[][]) {
  const gx = Math.round((xMap / MAP_W_ORIG) * (grid[0].length - 1));
  const gy = Math.round((yMap / MAP_H_ORIG) * (grid.length - 1));
  return [
    Math.max(0, Math.min(grid[0].length - 1, gx)),
    Math.max(0, Math.min(grid.length - 1, gy)),
  ];
}

function gridToMapCoords(gx: number, gy: number, grid: number[][]) {
  const x = (gx / (grid[0].length - 1)) * MAP_W_ORIG;
  const y = (gy / (grid.length - 1)) * MAP_H_ORIG;
  return [x, y];
}

// Bresenham line walkability check for path smoothing
function isLineWalkable(from: [number, number], to: [number, number], grid: number[][]): boolean {
  let [x, y] = from;
  const [x1, y1] = to;
  const dx = Math.abs(x1 - x);
  const dy = Math.abs(y1 - y);
  const sx = x < x1 ? 1 : -1;
  const sy = y < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    if (!grid[y] || grid[y][x] === 1) return false;
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return true;
}

// Greedy path smoothing: skip waypoints if a direct line is walkable
function smoothPath(path: [number, number][], grid: number[][]): [number, number][] {
  if (path.length < 3) return path;
  const smoothed: [number, number][] = [path[0]];
  let current = 0;
  while (current < path.length - 1) {
    let farthest = current + 1;
    for (let next = current + 2; next < path.length; next++) {
      if (isLineWalkable(path[current], path[next], grid)) {
        farthest = next;
      } else {
        break;
      }
    }
    smoothed.push(path[farthest]);
    current = farthest;
  }
  return smoothed;
}

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
  options?: { padding?: number; stride?: number },
): [number, number][] {
  const baseGrid = gridData;
  // stride=3 reduces a 844×1853 grid to ~281×618 — much faster while keeping accuracy
  const stride = options?.stride ?? 3;
  const paddingRadius = options?.padding ?? 10;

  // Pad first, then downsample
  const padded = paddingRadius ? padGrid(baseGrid, paddingRadius) : baseGrid;
  const working = stride > 1 ? downsampleGrid(padded, stride) : padded;

  if (!PF) {
    return straightLinePath(startMap, endMap, 40);
  }

  const pfGrid = new PF.Grid(working);
  // A* is much faster than Dijkstra for single-target pathfinding
  const finder = new PF.AStarFinder({ allowDiagonal: true, dontCrossCorners: true });

  const [sx, sy] = mapToGridCoords(startMap[0], startMap[1], working);
  const [ex, ey] = mapToGridCoords(endMap[0], endMap[1], working);

  const rawPath = finder.findPath(sx, sy, ex, ey, pfGrid) as [number, number][];
  if (!rawPath || rawPath.length === 0) return [];

  // Convert back to map coordinates
  const mapPath = rawPath.map(([gx, gy]: [number, number]) =>
    gridToMapCoords(gx, gy, working) as [number, number],
  );

  // Smooth using the unpadded downsampled grid for cleaner lines
  const smoothGrid = stride > 1 ? downsampleGrid(baseGrid, stride) : baseGrid;
  return smoothPath(mapPath, smoothGrid);
}

export function getGridDimensions() {
  return { cols: gridData[0].length, rows: gridData.length };
}
