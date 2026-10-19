/* Reproducible manufacturer-reference import. No repainting or shape editing. */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { styles } = require('../assets/js/ride-studio-model');
const root = path.resolve(__dirname, '..');
async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Invalid photo: ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
(async () => {
  await fs.mkdir(path.join(root, 'assets/images/ride-studio'), { recursive: true });
  for (const [id, bike] of Object.entries(styles)) {
    for (const photo of bike.images) {
      const input = await download(photo.original);
      await sharp(input).resize({width:1536,height:960,fit:'contain',background:'#f1f1f1'}).webp({quality:87}).toFile(path.join(root, photo.src));
      await sharp(input).resize({width:640,height:400,fit:'contain',background:'#f1f1f1'}).webp({quality:82}).toFile(path.join(root, photo.small));
    }
    await sharp(await download(bike.diagramSource)).webp({quality:90}).toFile(path.join(root, bike.diagram));
    console.log(`Imported ${id}: three genuine photos, responsive variants, official geometry diagram.`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
