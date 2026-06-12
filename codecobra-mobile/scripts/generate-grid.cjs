// Regenerates src/data/grid.json from the clean floor plan PNG, using the
// exact same walkability rule as Pathfinding/pathfiding.tsx: a pixel is
// walkable (0) only if it is exactly RGB(231, 231, 233).
//
// Run from codecobra-mobile:  node scripts/generate-grid.cjs

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const INPUT = path.join(__dirname, '..', 'src', 'imports', 'PlattegrondGieterijBeganegrondV2.0Clean.png');
const OUTPUT = path.join(__dirname, '..', 'src', 'data', 'grid.json');

const png = PNG.sync.read(fs.readFileSync(INPUT));
const { width, height, data } = png;

const matrix = [];
let walkable = 0;
for (let y = 0; y < height; y++) {
  const row = new Array(width);
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const isWalkable = data[i] === 231 && data[i + 1] === 231 && data[i + 2] === 233;
    row[x] = isWalkable ? 0 : 1;
    if (isWalkable) walkable++;
  }
  matrix.push(row);
}

fs.writeFileSync(OUTPUT, JSON.stringify(matrix));
console.log(`grid.json written: ${width}x${height}, ${walkable} walkable cells (${((walkable / (width * height)) * 100).toFixed(1)}%)`);
