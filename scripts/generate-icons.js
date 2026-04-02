#!/usr/bin/env node
'use strict';

/**
 * Generates all PWA icon sizes from an SVG template using sharp.
 * Output: client/icons/
 */

const path = require('path');
const fs   = require('fs');
let sharp;

try {
  sharp = require('sharp');
} catch (e) {
  console.error('sharp not installed. Run: npm install --save-dev sharp');
  process.exit(1);
}

const OUT_DIR = path.join(__dirname, '..', 'client', 'icons');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Master SVG — cyberpunk DI logo
// Black bg, cyan top-left, magenta center, lime bottom-right, "DI" text
function makeSvg(size, maskable) {
  const pad = maskable ? Math.round(size * 0.1) : 0; // 10% safe-zone padding for maskable
  const inner = size - pad * 2;
  const q = Math.round(inner * 0.35);
  const cx = pad, cy = pad;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#0f172a"/>
  <!-- Cyan block top-left -->
  <rect x="${cx}" y="${cy}" width="${q}" height="${q}" fill="#06b6d4" rx="4"/>
  <!-- Magenta block center -->
  <rect x="${cx + Math.round(inner*0.25)}" y="${cy + Math.round(inner*0.25)}" width="${Math.round(inner*0.5)}" height="${Math.round(inner*0.5)}" fill="#ec4899" rx="4"/>
  <!-- Lime block bottom-right -->
  <rect x="${cx + inner - q}" y="${cy + inner - q}" width="${q}" height="${q}" fill="#84cc16" rx="4"/>
  <!-- "DI" text -->
  <text
    x="50%"
    y="50%"
    dominant-baseline="central"
    text-anchor="middle"
    font-family="monospace"
    font-weight="900"
    font-size="${Math.round(inner * 0.28)}px"
    fill="white"
    letter-spacing="-2">DI</text>
</svg>`;
}

// Search icon — cyan magnifying glass on dark bg
function makeSearchSvg(size) {
  const s = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="#0f172a"/>
  <circle cx="${Math.round(s*0.42)}" cy="${Math.round(s*0.42)}" r="${Math.round(s*0.25)}" stroke="#06b6d4" stroke-width="${Math.round(s*0.07)}" fill="none"/>
  <line x1="${Math.round(s*0.61)}" y1="${Math.round(s*0.61)}" x2="${Math.round(s*0.82)}" y2="${Math.round(s*0.82)}" stroke="#06b6d4" stroke-width="${Math.round(s*0.08)}" stroke-linecap="round"/>
</svg>`;
}

// Bookmark icon — yellow bookmark on dark bg
function makeBookmarkSvg(size) {
  const s = size;
  const bx = Math.round(s*0.3), bw = Math.round(s*0.4);
  const by = Math.round(s*0.2), bh = Math.round(s*0.62);
  const mx = bx + Math.round(bw/2), my = Math.round(s*0.65);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="#0f172a"/>
  <polygon
    points="${bx},${by} ${bx+bw},${by} ${bx+bw},${by+bh} ${mx},${my} ${bx},${by+bh}"
    fill="#eab308"/>
</svg>`;
}

const icons = [
  { name: 'icon-32.png',       size: 32,  svg: (s) => makeSvg(s, false) },
  { name: 'icon-180.png',      size: 180, svg: (s) => makeSvg(s, false) },
  { name: 'icon-192.png',      size: 192, svg: (s) => makeSvg(s, false) },
  { name: 'icon-512.png',      size: 512, svg: (s) => makeSvg(s, false) },
  { name: 'icon-maskable.png', size: 512, svg: (s) => makeSvg(s, true)  },
  { name: 'search-icon.png',   size: 192, svg: (s) => makeSearchSvg(s)  },
  { name: 'bookmark-icon.png', size: 192, svg: (s) => makeBookmarkSvg(s)},
];

async function generate() {
  console.log('Generating PWA icons...');

  for (const icon of icons) {
    const svgBuffer = Buffer.from(icon.svg(icon.size));
    const outPath = path.join(OUT_DIR, icon.name);
    await sharp(svgBuffer).png().toFile(outPath);
    console.log(`  ✓ ${icon.name} (${icon.size}x${icon.size})`);
  }

  console.log(`Done — ${icons.length} icons written to client/icons/`);
}

generate().catch((err) => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
