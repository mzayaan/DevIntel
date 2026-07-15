#!/usr/bin/env node
'use strict';

/**
 * Generates PWA icon set + iOS splash screens from SVG templates using sharp.
 * Output: client/icons/ (icons), client/icons/splash/ (iOS launch screens)
 *
 * Logo: amber→orange gradient rounded-square chip with a "D" mark and a
 * signal-pulse accent dot, on a dark navy canvas. All icons are
 * maskable-safe — the chip sits within the central 80% of the canvas so
 * Android adaptive shapes (circle/squircle/rounded square) don't clip it.
 */

const path = require('path');
const fs   = require('fs');
let sharp;

try { sharp = require('sharp'); }
catch (_) {
  console.error('sharp not installed. Run: npm install --save-dev sharp');
  process.exit(1);
}

const OUT_DIR    = path.join(__dirname, '..', 'client', 'icons');
const SPLASH_DIR = path.join(OUT_DIR, 'splash');
if (!fs.existsSync(OUT_DIR))    fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(SPLASH_DIR)) fs.mkdirSync(SPLASH_DIR, { recursive: true });

const BG       = '#0b0f17'; // dark navy canvas
const ACCENT_1 = '#fbbf24'; // amber-400 — gradient start
const ACCENT_2 = '#ea580c'; // orange-600 — gradient end
const FG       = '#0b0f17'; // letter color (dark on amber chip)

/**
 * Master "D" logomark inside the 80% safe zone — gradient chip + pulse dot.
 */
function makeLogoSvg(size) {
  const safeInset = Math.round(size * 0.10);          // 10% padding on each side → 80% safe zone
  const inner     = size - safeInset * 2;
  const radius    = Math.round(inner * 0.26);
  const fontSize  = Math.round(inner * 0.58);
  const dotR      = Math.max(1, Math.round(inner * 0.085));
  const dotCx     = safeInset + Math.round(inner * 0.84);
  const dotCy     = safeInset + Math.round(inner * 0.18);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="chip" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${ACCENT_1}"/>
      <stop offset="100%" stop-color="${ACCENT_2}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <rect x="${safeInset}" y="${safeInset}" width="${inner}" height="${inner}" rx="${radius}" ry="${radius}" fill="url(#chip)"/>
  <text
    x="50%"
    y="53%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="-apple-system, 'Segoe UI', Inter, system-ui, sans-serif"
    font-weight="800"
    font-size="${fontSize}"
    fill="${FG}">D</text>
  <circle cx="${dotCx}" cy="${dotCy}" r="${dotR}" fill="${BG}" stroke="${ACCENT_1}" stroke-width="${Math.max(1, Math.round(dotR * 0.35))}"/>
</svg>`;
}

/**
 * iOS launch screen: brand-dark background, logomark centered at a modest scale.
 */
function makeSplashSvg(width, height) {
  const logoSize = Math.round(Math.min(width, height) * 0.32);
  const x = Math.round((width - logoSize) / 2);
  const y = Math.round((height - logoSize) / 2);
  const logo = makeLogoSvg(logoSize)
    .replace('<?xml version="1.0"?>', '')
    .replace(/<svg[^>]*>/, '')
    .replace('</svg>', '');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${BG}"/>
  <g transform="translate(${x}, ${y})">${logo}</g>
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
  <circle cx="${cx}" cy="${cy}" r="${r}" stroke="${ACCENT_1}" stroke-width="${stroke}" fill="none"/>
  <line x1="${cx + Math.round(r*0.7)}" y1="${cy + Math.round(r*0.7)}" x2="${Math.round(size*0.78)}" y2="${Math.round(size*0.78)}" stroke="${ACCENT_1}" stroke-width="${stroke}" stroke-linecap="round"/>
</svg>`;
}

function makeBookmarkSvg(size) {
  const bx = Math.round(size * 0.32), bw = Math.round(size * 0.36);
  const by = Math.round(size * 0.20), bh = Math.round(size * 0.62);
  const mx = bx + Math.round(bw / 2), my = Math.round(size * 0.65);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <polygon points="${bx},${by} ${bx+bw},${by} ${bx+bw},${by+bh} ${mx},${my} ${bx},${by+bh}" fill="${ACCENT_1}"/>
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

// iOS splash screens — [cssWidth, cssHeight, ratio, device label]
const SPLASH_DEVICES = [
  [375,  667,  2, 'iphone-se-8'],
  [375,  812,  3, 'iphone-x-11pro'],
  [390,  844,  3, 'iphone-12-13-14'],
  [393,  852,  3, 'iphone-14pro-15-16'],
  [414,  736,  3, 'iphone-6-7-8-plus'],
  [414,  896,  3, 'iphone-11promax-xsmax'],
  [428,  926,  3, 'iphone-12-13-promax-14plus'],
  [430,  932,  3, 'iphone-14-15-16-promax'],
  [768,  1024, 2, 'ipad-mini-air-97'],
  [810,  1080, 2, 'ipad-102'],
  [820,  1180, 2, 'ipad-air-109'],
  [834,  1112, 2, 'ipad-pro-105'],
  [834,  1194, 2, 'ipad-pro-11'],
  [1024, 1366, 2, 'ipad-pro-129'],
];

const splashes = SPLASH_DEVICES.map(([cw, ch, ratio, label]) => ({
  name: `splash-${label}.png`,
  width: cw * ratio,
  height: ch * ratio,
  cssWidth: cw,
  cssHeight: ch,
  ratio,
}));

async function generate() {
  console.log('Generating PWA icons...');
  for (const icon of icons) {
    const buf = Buffer.from(icon.svg(icon.size));
    const outPath = path.join(OUT_DIR, icon.name);
    await sharp(buf).png().toFile(outPath);
    console.log(`  ✓ ${icon.name} (${icon.size}x${icon.size})`);
  }
  console.log(`Done — ${icons.length} icons written to client/icons/`);

  console.log('Generating iOS splash screens...');
  for (const s of splashes) {
    const svg = makeSplashSvg(s.width, s.height);
    const outPath = path.join(SPLASH_DIR, s.name);
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    console.log(`  ✓ ${s.name} (${s.width}x${s.height})`);
  }
  console.log(`Done — ${splashes.length} splash screens written to client/icons/splash/`);
}

generate().catch((err) => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
