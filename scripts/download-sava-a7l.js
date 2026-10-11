// Original manufacturer images for the 2026 A7L product, through frame geometry.
const fs = require('node:fs');
const path = require('node:path');
const destination = path.resolve(__dirname, '../assets/products/sava-a7l-2026');
const cdn = 'https://savadeck-bike.com/cdn/shop/files/';
const entries = [
  ['grey-angle.jpg','sava-a7l-2026-full-carbon-road-bike-24-speed-01-2026-sava-a7l-carbon-road-bike-silver-front-45-degree-main.jpg','Silver / Grey, 45-degree view','gallery','Grey'],
  ['grey-side.jpg','sava-a7l-2026-full-carbon-road-bike-24-speed-02-2026-sava-a7l-carbon-road-bike-silver-side-profile-main.jpg','Silver / Grey, side profile','gallery','Grey'],
  ['white-angle.jpg','sava-a7l-2026-full-carbon-road-bike-24-speed-03-2026-sava-a7l-carbon-road-bike-white-front-45-degree-main.jpg','White, 45-degree view','gallery','White'],
  ['white-side.jpg','sava-a7l-2026-full-carbon-road-bike-24-speed-04-2026-sava-a7l-carbon-road-bike-white-side-profile-main.jpg','White, side profile','gallery','White'],
  ['red-side.jpg','2026_New_A7L-Red_2.jpg','Red, front-facing view','gallery','Red'],
  ['red-angle.jpg','2026_New_A7L-Red.jpg','Red, 45-degree view','gallery','Red'],
  ['black-side.jpg','2026_New_A7L-Black_2.jpg','Black, front-facing view','gallery','Black'],
  ['black-angle.jpg','2026_New_A7L-Black.jpg','Black, 45-degree view','gallery','Black'],
  ['blue-side.jpg','2026_New_A7L-Blue_2.jpg','Blue, front-facing view','gallery','Blue'],
  ['blue-angle.jpg','2026_New_A7L-Blue.jpg','Blue, 45-degree view','gallery','Blue'],
  ['video-poster.jpg','preview_images/b8ae5c9d55d94c06bf9ac6fd083e910c.thumbnail.0000000000.jpg','2026 A7L video poster','gallery'],
  ['outdoor.jpg','2026_A7L_riding_scene_image_3.jpg','2026 A7L outdoor cycling','gallery'],
  ['shifters.jpg','Shifterlevers-NewA7L.jpg','SENSAH HRD shifter levers','gallery'],
  ['crankset.jpg','Crankset-NewA7L.jpg','A7L 50/34T crankset','gallery'],
  ['handlebar.jpg','handlebar-NewA7L.jpg','Integrated carbon handlebar','gallery'],
  ['derailleur.jpg','Rearderailleur-NewA7L.jpg','Shimano 105 R7100 rear derailleur','gallery'],
  ['brake.jpg','2026_A7L_brake.jpg','SENSAH hydraulic disc brake','gallery'],
  ['uci.jpg','UCI-NewA7L.jpg','UCI approved carbon frame','gallery'],
  ['wheels.jpg','Wheels-NewA7L.jpg','700C carbon wheels','gallery'],
  ['overview-desktop.jpg','SAVA_2026_A7L.jpg','SAVA A7L 2026 overview desktop banner','overview'],
  ['overview-mobile.jpg','SAVA_2026_A7L_2.jpg','SAVA A7L 2026 overview mobile banner','overview'],
  ['carbon-parts-desktop.jpg','full_carbon_fiber_parts-2026_A7L.jpg','Full carbon parts desktop banner','overview'],
  ['carbon-parts-mobile.jpg','full_carbon_fiber_parts-2026_A7L_2.jpg','Full carbon parts mobile banner','overview'],
  ['t800-desktop.jpg','T800_full_carbon_struction.jpg','Full T800 Carbon Construction desktop','carbon'],
  ['aero-desktop.jpg','full_carbon_fiber_parts.jpg','T800 Carbon Frame Aero Geometry desktop','carbon'],
  ['t800-mobile.jpg','T800_full_carbon_struction_2.jpg','Full T800 Carbon Construction mobile','carbon'],
  ['aero-mobile.jpg','full_carbon_fiber_parts_2.jpg','T800 Carbon Frame Aero Geometry mobile','carbon'],
  ['highlight-cockpit.jpg','Handlebar-2026_SAVA_A7L.jpg','Sleek Aero Cable Management','highlights'],
  ['highlight-shifters.jpg','Shifter_levers-2026_SAVA_A7L.jpg','SENSAH HRD shifters','highlights'],
  ['highlight-derailleur.jpg','SHIAMNO_105_R7100_Derailleur_System-2026_SAVA_A7L.jpg','Shimano 105 R7100 derailleur system','highlights'],
  ['highlight-brake.jpg','2026_A7L_brake_2.jpg','SENSAH hydraulic disc brakes','highlights'],
  ['highlight-crankset.jpg','Crankset-2026_SAVA_A7L.jpg','Lightweight 50/34T crankset','highlights'],
  ['highlight-uci.jpg','UCI-2026_SAVA_A7L.jpg','UCI Approved','highlights'],
  ['racing.jpg','2026_A7L_riding_scene_image_2.jpg','Racing and competitive riding','riding'],
  ['recreation.jpg','2026_A7L_riding_scene_image_4.jpg','Daily recreational riding','riding'],
  ['travel.png','2026_new_sava_a7l_for_travelling.png','Travel and outdoor adventure','riding'],
  ['factory.jpg','sava_factory_fa2b6f05-a3a3-4b71-b844-ebf8e8283920.jpg','SAVA factory','background'],
  ['race-banner.jpg','racing.jpg','SAVA racing','background'],
  ['geometry.jpg','https://cdn.shopify.com/s/files/1/0385/7176/9995/files/R21_frame_geometry_2048x2048.jpg?v=1742378006','R21 frame geometry','geometry']
];

async function main() {
  fs.mkdirSync(destination, { recursive: true });
  const assets = entries.map(([file, original, alt, group, colour]) => ({
    localPath: `assets/products/sava-a7l-2026/${file}`,
    originalUrl: original.startsWith('https:') ? original : `${cdn}${original}`,
    alt, group, ...(colour ? { colour } : {})
  }));
  const queue = [...assets];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const item = queue.shift();
      const file = path.join(destination, path.basename(item.localPath));
      if (fs.existsSync(file) && fs.statSync(file).size > 1000) continue;
      const response = await fetch(item.originalUrl, { signal: AbortSignal.timeout(45000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Invalid image response: ${item.localPath}, ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 1000) throw new Error(`Image too small: ${item.localPath}`);
      fs.writeFileSync(file, bytes);
      console.log(`Downloaded ${path.basename(file)} (${Math.round(bytes.length / 1024)} KB)`);
    }
  }));
  fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify({ source: 'https://savadeck-bike.com/products/sava-a7l-2026-full-carbon-road-bike-24-speed', assets }, null, 2) + '\n');
  console.log(`Saved ${assets.length} original manufacturer images.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
