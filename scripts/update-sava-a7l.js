const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'product.html');
const template = fs.readFileSync(templatePath, 'utf8');
const match = template.match(/const\s+products\s*=\s*(\[[\s\S]*?\]);/);
const products = vm.runInNewContext(`(${match[1]})`, {}, { timeout: 1000 });
const canonical = products.find(product => product.id === 63);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/products/sava-a7l-2026/manifest.json'), 'utf8'));
canonical.name = 'SAVA A7L 2026 Full Carbon Road Bike 24 Speed';
canonical.brand = 'SAVA';
canonical.price = 129999;
canonical.optionsBySize = {
  S: ['Blue', 'White', 'Grey'],
  M: ['White', 'Grey', 'Blue', 'Red'],
  L: ['Red', 'Black']
};
canonical.specs = canonical.specs.filter(spec => !/^Approximate weight\s*:/i.test(spec));
canonical.categoryPage = 'bikes-frames.html';
canonical.categoryLabel = 'Bikes & Frames';
canonical.image = 'assets/products/sava-a7l-2026/blue-angle.jpg';
canonical.images = [canonical.image, ...manifest.assets.filter(item => item.group === 'gallery' && item.localPath !== canonical.image).map(item => item.localPath)];
canonical.imageByColour = Object.fromEntries(['Black', 'Blue', 'White', 'Red', 'Grey'].map(colour => [colour, `assets/products/sava-a7l-2026/${colour.toLowerCase()}-angle.jpg`]));
canonical.description = '2026 SAVA A7L full-carbon road bike with SENSAH HRD 2 x 12-speed controls, Shimano 105 R7100 derailleurs, hydraulic disc brakes and 50 mm carbon wheels.';
canonical.detailStories.forEach(story => {
  const mapping = [ [/Hydraulic/, 'brake'], [/Crankset/, 'crankset'], [/Cockpit/, 'handlebar'], [/Shifting/, 'derailleur'], [/Wheelset/, 'wheels'], [/Controls/, 'shifters'], [/UCI/, 'uci'] ];
  const found = mapping.find(([pattern]) => pattern.test(story.title));
  if (found) story.image = `assets/products/sava-a7l-2026/${found[1]}.jpg`;
});
for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
  const filePath = path.join(root, file);
  let source = fs.readFileSync(filePath, 'utf8');
  const matches = [...source.matchAll(/(?:"id"|\bid)\s*:\s*63\b/g)].reverse();
  for (const found of matches) {
    const start = source.lastIndexOf('{', found.index);
    let depth = 0, quote = '', escaped = false, end = -1;
    for (let at = start; at < source.length; at++) {
      const char = source[at];
      if (quote) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === quote) quote = ''; continue; }
      if ('"\'`'.includes(char)) { quote = char; continue; }
      if (char === '{') depth++;
      if (char === '}' && --depth === 0) { end = at + 1; break; }
    }
    if (end < 0) throw new Error(`Incomplete product object: ${file}`);
    const existing = vm.runInNewContext(`(${source.slice(start, end)})`, {}, { timeout: 1000 });
    if (existing.id !== 63) throw new Error(`Wrong product object: ${file}`);
    source = source.slice(0, start) + JSON.stringify({ ...existing, ...canonical }, null, 4) + source.slice(end);
  }
  if (matches.length) { fs.writeFileSync(filePath, source, 'utf8'); console.log(`Updated A7L in ${file}`); }
}
