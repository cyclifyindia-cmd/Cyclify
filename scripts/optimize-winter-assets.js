const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const dir = path.resolve(__dirname, '../assets/campaigns');
(async () => {
  for (const [source, target, width, quality] of [
    ['winter-festival-2026-hero.png','winter-festival-2026-hero.webp',1600,76],
    ['winter-festival-2026-hero.png','winter-festival-2026-hero-mobile.webp',760,72],
    ['winter-festival-2026-santa-flight.png','winter-festival-2026-santa-flight.webp',1400,78]
  ]) {
    await sharp(path.join(dir,source)).resize({width,withoutEnlargement:true}).webp({quality,alphaQuality:85,effort:6}).toFile(path.join(dir,target));
    console.log(target + ': ' + fs.statSync(path.join(dir,target)).size + ' bytes');
  }
})();
