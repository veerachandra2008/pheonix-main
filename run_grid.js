const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function runGrid() {
  const inputPath = path.join(__dirname, 'public', 'winners.jpeg');
  const metadata = await sharp(inputPath).metadata();

  const containerW = 1920;
  const containerH = 950;

  // Let's test combinations to find the exact framing
  // Notice:
  // In HeroCarousel.tsx on 1920 desktop:
  // max-w-7xl is 1280px wide, centered in 1920 -> left margin is 320px.
  // px-6 sm:px-12 lg:px-16 -> lg:px-16 is 64px.
  // So text content left is 320 + 64 = 384px!
  // Top padding: pt-48 = 192px!
  // Badge: left: 384px, top: 192px, width: ~180px, height: 32px.
  // Title "HONORING THE SEASON": top: 236px, height: ~45px.
  // Title "GRAND CHAMPIONS": top: 285px, height: ~45px.
  // Subtitle: top: 345px.
  // Buttons: top: 410px.

  const tests = [
    // Pure vertical adjustments
    { id: 'pure_y24', y: 0.24, scale: 1.0, tx: 0 },
    { id: 'pure_y25', y: 0.25, scale: 1.0, tx: 0 },
    { id: 'pure_y26', y: 0.26, scale: 1.0, tx: 0 },

    // Nudge right so left winner clears the badge/title horizontally
    { id: 'y24_tx3', y: 0.24, scale: 1.04, tx: 0.03 },
    { id: 'y24_tx5', y: 0.24, scale: 1.06, tx: 0.05 },
    { id: 'y24_tx7', y: 0.24, scale: 1.08, tx: 0.07 },

    { id: 'y25_tx3', y: 0.25, scale: 1.04, tx: 0.03 },
    { id: 'y25_tx5', y: 0.25, scale: 1.06, tx: 0.05 },
    { id: 'y25_tx7', y: 0.25, scale: 1.08, tx: 0.07 },

    { id: 'y26_tx4', y: 0.26, scale: 1.05, tx: 0.04 },
    { id: 'y26_tx6', y: 0.26, scale: 1.07, tx: 0.06 },
  ];

  for (const t of tests) {
    const baseScale = Math.max(containerW / metadata.width, containerH / metadata.height);
    const scaledW = Math.round(metadata.width * baseScale * t.scale);
    const scaledH = Math.round(metadata.height * baseScale * t.scale);

    const resizedBuffer = await sharp(inputPath)
      .resize(scaledW, scaledH, { fit: 'fill' })
      .toBuffer();

    const baseCropLeft = Math.round((scaledW - containerW) * 0.5);
    const baseCropTop = Math.round((scaledH - containerH) * t.y);

    const translateX = Math.round(containerW * t.tx);

    let cropLeft = baseCropLeft - translateX;
    let cropTop = baseCropTop;

    cropLeft = Math.max(0, Math.min(scaledW - containerW, cropLeft));
    cropTop = Math.max(0, Math.min(scaledH - containerH, cropTop));

    const svgOverlay = Buffer.from(`
      <svg width="${containerW}" height="${containerH}">
        <!-- Navbar at top (y: 0 to 70px) -->
        <rect x="0" y="0" width="${containerW}" height="70" fill="rgba(0,0,0,0.6)" />
        <rect x="460" y="16" width="600" height="38" rx="19" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" />
        <line x1="0" y1="70" x2="${containerW}" y2="70" stroke="#10b981" stroke-width="2" stroke-dasharray="6,4" />
        <text x="20" y="65" fill="#10b981" font-size="12" font-family="sans-serif">NAVBAR BOTTOM (70px)</text>

        <!-- Badge at top-left: pt-48 = 192px -->
        <rect x="384" y="192" width="180" height="32" rx="16" fill="rgba(245,158,11,0.25)" stroke="#f59e0b" stroke-width="1.5" />
        <text x="396" y="213" fill="#f59e0b" font-size="12" font-family="sans-serif" font-weight="bold">🏆 HALL OF CHAMPIONS</text>

        <!-- Title -->
        <text x="384" y="270" fill="white" font-size="36" font-family="sans-serif" font-weight="900">HONORING THE SEASON</text>
        <text x="384" y="315" fill="#fbbf24" font-size="36" font-family="sans-serif" font-weight="900">GRAND CHAMPIONS</text>

        <!-- Subtitle -->
        <text x="384" y="355" fill="#9ca3af" font-size="15" font-family="sans-serif">Celebrating triumphant collegiate athletes who dominated...</text>

        <!-- Buttons -->
        <rect x="384" y="390" width="200" height="44" rx="22" fill="#059669" />
        <text x="415" y="417" fill="white" font-size="13" font-family="sans-serif" font-weight="bold">VIEW LEADERBOARDS →</text>
        <rect x="600" y="390" width="170" height="44" rx="22" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" />
        <text x="625" y="417" fill="white" font-size="13" font-family="sans-serif" font-weight="bold">COLLEGE RANKINGS</text>

        <!-- Top Right Slide Counter: 03 / 04 PAUSED -->
        <rect x="1450" y="192" width="120" height="32" rx="16" fill="rgba(0,0,0,0.7)" stroke="rgba(255,255,255,0.15)" />
        <text x="1465" y="213" fill="#34d399" font-size="12" font-family="sans-serif" font-weight="bold">03 <tspan fill="white">/ 04 PAUSED</tspan></text>
      </svg>
    `);

    const outPath = `C:\\Users\\veera\\.gemini\\antigravity-ide\\brain\\fc3084d1-0a62-4ef5-863c-70d2a228cc0e\\grid_${t.id}.png`;

    await sharp(resizedBuffer)
      .extract({ left: cropLeft, top: cropTop, width: containerW, height: containerH })
      .composite([{ input: svgOverlay }])
      .toFile(outPath);

    console.log(`Saved: grid_${t.id}.png`);
  }
}

runGrid().catch(console.error);
