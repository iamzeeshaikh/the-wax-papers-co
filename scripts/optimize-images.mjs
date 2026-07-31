// Generate WebP renditions (1000 / 700 / 400px) for every raster image in a
// public/images tree, keeping the originals in place as fallbacks.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const [, , root, projectRoot] = process.argv;
const require = createRequire(path.join(projectRoot, 'package.json'));
const sharp = require('sharp');

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(jpe?g|png)$/i.test(entry.name) && !entry.name.startsWith('._')) files.push(full);
  }
})(root);

const RENDITIONS = [
  { suffix: '', width: 1000, quality: 76 },
  { suffix: '-700', width: 700, quality: 74 },
  { suffix: '-400', width: 400, quality: 72 },
];

let written = 0, before = 0, after = 0;
const failures = [];
const queue = [...files];

async function worker() {
  while (queue.length) {
    const file = queue.pop();
    const base = file.replace(/\.(jpe?g|png)$/i, '');
    before += fs.statSync(file).size;
    for (const { suffix, width, quality } of RENDITIONS) {
      const target = `${base}${suffix}.webp`;
      try {
        const buf = await sharp(file)
          .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
          .webp({ quality, effort: 5 })
          .toBuffer();
        fs.writeFileSync(target, buf);
        after += buf.length;
        written++;
      } catch (e) { failures.push(file + suffix + ': ' + e.message); }
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`sources ${files.length} · written ${written}`);
console.log(`originals ${(before / 1048576).toFixed(1)}MB -> webp set ${(after / 1048576).toFixed(1)}MB`);
if (failures.length) console.log('failed:\n' + failures.slice(0, 5).join('\n'));
