const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SVG_PATH = path.join(__dirname, '..', 'public', 'icon.svg');
const OUT_DIR = path.join(__dirname, '..', 'public');

const SIZES = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function generate() {
  const svg = fs.readFileSync(SVG_PATH);

  for (const { name, size } of SIZES) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(OUT_DIR, name));
    console.log(`  ${name} (${size}x${size})`);
  }

  // Maskable icon: same icon but with extra padding for safe area
  const maskableSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1a1a1a"/>
  <text x="256" y="370" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="280" font-weight="300" fill="#ffffff" letter-spacing="-6">n</text>
</svg>`);

  await sharp(maskableSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(OUT_DIR, 'icon-maskable-512.png'));
  console.log('  icon-maskable-512.png (512x512, maskable)');

  await sharp(maskableSvg)
    .resize(192, 192)
    .png()
    .toFile(path.join(OUT_DIR, 'icon-maskable-192.png'));
  console.log('  icon-maskable-192.png (192x192, maskable)');

  console.log('\nDone! Icons generated in public/');
}

generate().catch(console.error);
