// Script to generate walkability grid from plattegrondreferentieV4.0.png
// Green = walkable paths, Red = obstacles/walls
import { writeFileSync } from 'fs';
import sharp from 'sharp';

const WALK_STEP = 8;
const TARGET_W = 1528;
const TARGET_H = 704;
const GRID_W = Math.ceil(TARGET_W / WALK_STEP);
const GRID_H = Math.ceil(TARGET_H / WALK_STEP);

async function generateWalkabilityGrid() {
  console.log('Loading reference image with green/red walkability zones...');

  const image = sharp('src/imports/plattegrondreferentieV4.0.png');
  const metadata = await image.metadata();

  console.log(`Image dimensions: ${metadata.width} x ${metadata.height}`);
  console.log(`Target dimensions: ${TARGET_W} x ${TARGET_H}`);
  console.log(`Grid size: ${GRID_W} x ${GRID_H} (step: ${WALK_STEP}px)`);

  // Get raw pixel data
  const { data, info } = await image
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  // Scale factors to map grid coordinates to image pixels
  const scaleX = info.width / TARGET_W;
  const scaleY = info.height / TARGET_H;

  console.log(`Scale factors: ${scaleX.toFixed(3)} x ${scaleY.toFixed(3)}`);

  // Generate walkability grid
  const grid = new Uint8Array(GRID_W * GRID_H);
  let walkableCount = 0;
  let redCount = 0;

  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      // Sample center of grid cell
      const px = Math.floor((gx * WALK_STEP + WALK_STEP / 2) * scaleX);
      const py = Math.floor((gy * WALK_STEP + WALK_STEP / 2) * scaleY);

      // Get pixel color (RGBA format)
      const idx = (py * info.width + px) * info.channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Color detection:
      // Green = walkable (0), Red = obstacle (1)
      const isGreen = g > 100 && g > r + 30 && g > b + 30;
      const isRed = r > 100 && r > g + 30 && r > b + 30;

      if (isGreen) {
        grid[gy * GRID_W + gx] = 0; // Walkable
        walkableCount++;
      } else if (isRed) {
        grid[gy * GRID_W + gx] = 1; // Wall/Obstacle
        redCount++;
      } else {
        // Default: treat unmarked areas as walls
        grid[gy * GRID_W + gx] = 1;
      }
    }
  }

  console.log(`Green (walkable) cells: ${walkableCount} / ${GRID_W * GRID_H} (${(walkableCount / (GRID_W * GRID_H) * 100).toFixed(1)}%)`);
  console.log(`Red (obstacle) cells: ${redCount} / ${GRID_W * GRID_H} (${(redCount / (GRID_W * GRID_H) * 100).toFixed(1)}%)`);

  // Encode to base64 (direct byte encoding, 0 = walkable, 1 = wall)
  const base64 = Buffer.from(grid).toString('base64');

  // Generate TypeScript code
  const code = `// Walkability grid derived from plattegrondreferentieV4.0.png.
// The grid uses color coding: green = walkable paths, red = obstacles/walls.
// This grid is used for pathfinding.js; the display uses the clean plattegrond.
// Matrix format: 0 = walkable (green), 1 = wall/obstacle (red)

import * as PF from 'pathfinding';

export const WALK_STEP = ${WALK_STEP};
export const WALK_GW = ${GRID_W};
export const WALK_GH = ${GRID_H};
export const WALK_IMG_W = WALK_GW * WALK_STEP;
export const WALK_IMG_H = WALK_GH * WALK_STEP;

const WALK_B64 =
  '${base64}';

function decode(): Uint8Array {
  try {
    const cleanB64 = WALK_B64.replace(/\\s/g, '');
    const bin = atob(cleanB64);
    const out = new Uint8Array(WALK_GW * WALK_GH);
    for (let i = 0; i < bin.length; i++) {
      out[i] = bin.charCodeAt(i);
    }
    return out;
  } catch (error) {
    console.error('Failed to decode walkability grid:', error);
    return new Uint8Array(WALK_GW * WALK_GH).fill(1); // All walls on error
  }
}

export const WALK_GRID = decode();

export function isWalkable(gx: number, gy: number): boolean {
  if (gx < 0 || gy < 0 || gx >= WALK_GW || gy >= WALK_GH)
    return false;
  return WALK_GRID[gy * WALK_GW + gx] === 0; // 0 = walkable
}

export function snapToWalkable(
  px: number,
  py: number,
): [number, number] {
  const gx0 = Math.min(
    WALK_GW - 1,
    Math.max(0, Math.floor(px / WALK_STEP)),
  );
  const gy0 = Math.min(
    WALK_GH - 1,
    Math.max(0, Math.floor(py / WALK_STEP)),
  );
  if (isWalkable(gx0, gy0)) return [gx0, gy0];
  for (let r = 1; r < 40; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const gx = gx0 + dx,
          gy = gy0 + dy;
        if (isWalkable(gx, gy)) return [gx, gy];
      }
    }
  }
  return [gx0, gy0];
}

// Pathfinding using pathfinding.js library with A* algorithm
export function bfsPath(
  from: [number, number],
  to: [number, number],
): [number, number][] {
  const [fx, fy] = from;
  const [tx, ty] = to;

  if (fx === tx && fy === ty) return [from];

  // Convert 1D grid to 2D matrix for pathfinding.js
  const matrix: number[][] = [];
  for (let y = 0; y < WALK_GH; y++) {
    const row: number[] = [];
    for (let x = 0; x < WALK_GW; x++) {
      row.push(WALK_GRID[y * WALK_GW + x]);
    }
    matrix.push(row);
  }

  // Create grid and finder
  const grid = new PF.Grid(matrix);
  const finder = new PF.AStarFinder({
    allowDiagonal: false,
    dontCrossCorners: true,
  });

  // Find path
  const path = finder.findPath(fx, fy, tx, ty, grid);

  // Convert to our format: [[x, y], ...]
  return path.map(([x, y]) => [x, y] as [number, number]);
}

export function simplifyPath(
  cells: [number, number][],
): [number, number][] {
  if (cells.length < 3) return cells;
  const out: [number, number][] = [cells[0]];
  for (let i = 1; i < cells.length - 1; i++) {
    const [px, py] = cells[i - 1];
    const [cx, cy] = cells[i];
    const [nx, ny] = cells[i + 1];
    const dx1 = cx - px,
      dy1 = cy - py;
    const dx2 = nx - cx,
      dy2 = ny - cy;
    if (dx1 !== dx2 || dy1 !== dy2) out.push(cells[i]);
  }
  out.push(cells[cells.length - 1]);
  return out;
}

export function cellToPixel([gx, gy]: [number, number]): {
  x: number;
  y: number;
} {
  return {
    x: gx * WALK_STEP + WALK_STEP / 2,
    y: gy * WALK_STEP + WALK_STEP / 2,
  };
}
`;

  console.log('\nWriting to src/app/data/walkability.ts...');
  writeFileSync('src/app/data/walkability.ts', code);
  console.log('Done!');
}

generateWalkabilityGrid().catch(console.error);
