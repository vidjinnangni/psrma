// Generates public/og.png (1200x630). Run: node scripts/og.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="g" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M56 0H0V56" fill="none" stroke="#e4e4e8" stroke-width="1"/>
    </pattern>
    <radialGradient id="m" cx="50%" cy="0%" r="75%">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#fff"/>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="1200" height="630" fill="url(#m)"/>
  <g transform="translate(80 80)">
    <rect width="56" height="56" rx="14" fill="#111"/>
    <path d="M16 40V16h12a7.9 7.9 0 0 1 0 15.800H16" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="40.300" cy="38.500" r="4.600" fill="#0071e3"/>
  </g>
  <text x="152" y="119" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="34" font-weight="700" fill="#111">PSRMA</text>
  <text x="80" y="340" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="104" font-weight="700" letter-spacing="-4" fill="#111">De la recherche</text>
  <text x="80" y="450" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="104" font-weight="700" letter-spacing="-4" fill="#0071e3">à la méta-analyse.</text>
  <text x="80" y="550" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="30" fill="#6b6b73">PRISMA 2020 · Open source · Gratuit</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(fileURLToPath(new URL('../public/og.png', import.meta.url)));
console.log('public/og.png written');
