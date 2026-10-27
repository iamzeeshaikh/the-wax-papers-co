// Writes src/data/order-catalog.json (slug -> title) from src/data/products.ts so
// api/order.js, a plain-JS Vercel function, can re-price and name order lines without
// importing TypeScript. Runs before every build; the JSON is committed too.
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/data/products.ts', import.meta.url), 'utf8');
const map = {};
for (const m of src.matchAll(/slug:\s*'([^']+)',\s*\n\s*title:\s*'((?:[^'\\]|\\.)+)'/g)) map[m[1]] = m[2].replace(/\\'/g, "'");
const n = Object.keys(map).length;
const declared = (src.match(/^\s{4}slug:\s*'/gm) || []).length;
if (!n || n !== declared) { console.error(`order-catalog: parsed ${n} of ${declared} products`); process.exit(1); }
fs.writeFileSync(new URL('../src/data/order-catalog.json', import.meta.url), JSON.stringify(map, null, 2) + '\n');
console.log(`order-catalog: ${n} products`);
