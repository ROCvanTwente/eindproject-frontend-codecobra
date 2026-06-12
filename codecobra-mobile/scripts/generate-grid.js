// Node script to generate src/data/grid.json from the 'Clean' floorplan PNG.
// Usage: from codecobra-mobile folder run `npm run generate-grid` (installs: jimp required)

const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');

const SRC = path.join(__dirname, '../src/imports/PlattegrondGieterijBeganegrondV2.0Clean.png');
const OUT = path.join(__dirname, '../src/data/grid.json');

(async () => {
  try {
    const img = await Jimp.read(SRC);
    const w = img.bitmap.width;
    const h = img.bitmap.height;
    const matrix = [];

    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        const { r, g, b } = Jimp.intToRGBA(img.getPixelColor(x, y));
        // treat light-grey walkway (approx RGB 231,231,233) as walkable
        const isWalkable = r === 231 && g === 231 && b === 233;
        row.push(isWalkable ? 0 : 1);
      }
      matrix.push(row);
    }

    // ensure output directory exists
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(matrix));
    console.log('Generated grid.json:', OUT, 'size:', w, 'x', h);
  } catch (err) {
    console.error('Failed to generate grid:', err);
    process.exit(1);
  }
})();
