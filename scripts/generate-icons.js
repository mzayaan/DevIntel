#!/usr/bin/env node
'use strict';

/**
 * Generates PWA icon set from an SVG template using sharp.
 * Output: client/icons/
 *
 * Logo: amber "D" on dark navy background.
 * All icons are maskable-safe — logo sits within the central 80% of the canvas
 * so Android adaptive shapes (circle/squircle/rounded square) don't clip it.
 */

const path = require('path');
const fs   = require('fs');
let sharp;

try { sharp = require('sharp'); }
catch (_) {
  console.error('sharp not installed. Run: npm install --save-dev sharp');
  process.exit(1);
}

const OUT_DIR = path.join(__dirname, '..', 'client', 'icons');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const BG     = '#0f1117'; // dark canvas
const ACCENT = '#f59e0b'; // amber-500
const FG     = '#0f1117'; // letter color (dark on amber chip)

/**
 * Master "D" logomark inside the 80% safe zone.
 * Renders an amber rounded chip with a dark "D" centered.
 */
function makeLogoSvg(size) {
  const safeInset  = Math.round(size * 0.10);          // 10% padding on each side → 80% safe zone
  const inner      = size - safeInset * 2;
  const radius     = Math.round(inner * 0.22);         // soft squircle-ish
  const fontSize   = Math.round(inner * 0.62);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <rect x="${safeInset}" y="${safeInset}" width="${inner}" height="${inner}" rx="${radius}" ry="${radius}" fill="${ACCENT}"/>
  <text
    x="50%"
    y="52%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="-apple-system, 'Segoe UI', Inter, system-ui, sans-serif"
    font-weight="800"
    font-size="${fontSize}"
    fill="${FG}">D</text>
</svg>`;
}

// Shortcut icons — kept for manifest shortcuts.
function makeSearchSvg(size) {
  const stroke = Math.max(2, Math.round(size * 0.06));
  const cx = Math.round(size * 0.42);
  const cy = Math.round(size * 0.42);
  const r  = Math.round(size * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" stroke="${ACCENT}" stroke-width="${stroke}" fill="none"/>
  <line x1="${cx + Math.round(r*0.7)}" y1="${cy + Math.round(r*0.7)}" x2="${Math.round(size*0.78)}" y2="${Math.round(size*0.78)}" stroke="${ACCENT}" stroke-width="${stroke}" stroke-linecap="round"/>
</svg>`;
}

function makeBookmarkSvg(size) {
  const bx = Math.round(size * 0.32), bw = Math.round(size * 0.36);
  const by = Math.round(size * 0.20), bh = Math.round(size * 0.62);
  const mx = bx + Math.round(bw / 2), my = Math.round(size * 0.65);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <polygon points="${bx},${by} ${bx+bw},${by} ${bx+bw},${by+bh} ${mx},${my} ${bx},${by+bh}" fill="${ACCENT}"/>
</svg>`;
}

const PWA_SIZES = [32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

const icons = PWA_SIZES.map((size) => ({
  name: `icon-${size}.png`,
  size,
  svg: (s) => makeLogoSvg(s),
}));

// Dedicated maskable icon (same artwork — already maskable-safe at 80%)
icons.push({ name: 'icon-maskable.png', size: 512, svg: (s) => makeLogoSvg(s) });

// Shortcut icons
icons.push({ name: 'search-icon.png',   size: 192, svg: (s) => makeSearchSvg(s) });
icons.push({ name: 'bookmark-icon.png', size: 192, svg: (s) => makeBookmarkSvg(s) });

async function generate() {
  console.log('Generating PWA icons...');
  for (const icon of icons) {
    const buf = Buffer.from(icon.svg(icon.size));
    const outPath = path.join(OUT_DIR, icon.name);
    await sharp(buf).png().toFile(outPath);
    console.log(`  ✓ ${icon.name} (${icon.size}x${icon.size})`);
  }
  console.log(`Done — ${icons.length} icons written to client/icons/`);
}

generate().catch((err) => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
