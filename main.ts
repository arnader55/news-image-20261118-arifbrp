// "The World in One Day" — Wednesday, 18 November 2026.
// A front-page poster drawn from scratch in pure Node (stdlib only, no network):
// a tiny raster canvas, a hand-built 5x7 bitmap font, and a hand-rolled PNG encoder.
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(w, h, rgb) {
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0;
    rgb.copy(raw, y * (1 + w * 3) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ canvas
const W = 1024;
const H = 1024;
const buf = Buffer.alloc(W * H * 3);
const PAPER = [246, 241, 229];
const INK = [24, 24, 22];
const RED = [166, 38, 31];
const NAVY = [30, 58, 92];
const GOLD = [176, 132, 46];
const MUTED = [96, 88, 74];
const WHITE = [255, 255, 255];
const LIGHT = [232, 225, 210];

function fill(c) {
  for (let i = 0; i < W * H; i++) {
    buf[i * 3] = c[0];
    buf[i * 3 + 1] = c[1];
    buf[i * 3 + 2] = c[2];
  }
}
function px(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}
function rect(x, y, w, h, c) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, c);
}
function line(x0, y0, x1, y1, c, t = 1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let s = 0; s <= n; s++) {
    const x = Math.round(x0 + (dx * s) / n);
    const y = Math.round(y0 + (dy * s) / n);
    for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) px(x + a, y + b, c);
  }
}
function circle(cx, cy, r, c, fillIt = true) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (fillIt ? d <= r : d <= r && d > r - 2) px(cx + x, cy + y, c);
    }
  }
}
function hline(x, y, w, c, t = 1) {
  rect(x, y, w, t, c);
}

// -------------------------------------------------------------------- font
// 5x7 bitmap font, uppercase only (text is uppercased before drawing).
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '"': ['01010', '01010', '01010', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '*': ['00000', '10101', '01110', '10101', '00000', '00000', '00000'],
  '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
};

function textWidth(s, scale) {
  return s.toUpperCase().split('').reduce((w, ch) => w + 6 * scale, -scale);
}
function drawText(x, y, s, scale, c) {
  const up = s.toUpperCase();
  let cx = x;
  for (const ch of up) {
    const g = FONT[ch] || FONT['?'];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === '1') rect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}
function drawTextCentered(cx, y, s, scale, c) {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}
function wrapText(s, scale, maxW) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (textWidth(t, scale) <= maxW) {
      cur = t;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawWrapped(x, y, s, scale, maxW, c, leading = 4) {
  const lines = wrapText(s, scale, maxW);
  lines.forEach((ln, i) => drawText(x, y + i * (7 * scale + leading), ln, scale, c));
  return y + lines.length * (7 * scale + leading);
}

// ------------------------------------------------------------- flag chips
function flagUSA(x, y, w, h) {
  rect(x, y, w, h, WHITE);
  for (let i = 0; i < 7; i++) if (i % 2 === 0) rect(x, y + Math.floor((i * h) / 7), w, Math.ceil(h / 13), RED);
  rect(x, y, Math.floor(w * 0.42), Math.floor(h * 0.54), NAVY);
  for (let r = 0; r < 3; r++)
    for (let c2 = 0; c2 < 4; c2++) px(x + 6 + c2 * 12, y + 6 + r * 9, WHITE);
}
function flagIndia(x, y, w, h) {
  const th = Math.floor(h / 3);
  rect(x, y, w, th, [255, 153, 51]);
  rect(x, y + th, w, th, WHITE);
  rect(x, y + 2 * th, w, h - 2 * th, [19, 136, 8]);
  circle(x + Math.floor(w / 2), y + Math.floor(h / 2), Math.floor(th / 2) - 1, NAVY);
}
function flagJapan(x, y, w, h) {
  rect(x, y, w, h, WHITE);
  circle(x + Math.floor(w / 2), y + Math.floor(h / 2), Math.floor(h * 0.3), RED);
}
function flagAustralia(x, y, w, h) {
  rect(x, y, w, h, [0, 40, 104]);
  rect(x, y, Math.floor(w * 0.45), Math.floor(h * 0.5), [200, 16, 46]);
  line(x, y, x + Math.floor(w * 0.45), y + Math.floor(h * 0.5), WHITE, 2);
  line(x + Math.floor(w * 0.45), y, x, y + Math.floor(h * 0.5), WHITE, 2);
  circle(x + Math.floor(w * 0.75), y + Math.floor(h * 0.3), 3, WHITE);
  circle(x + Math.floor(w * 0.7), y + Math.floor(h * 0.7), 3, WHITE);
  circle(x + Math.floor(w * 0.88), y + Math.floor(h * 0.65), 3, WHITE);
}

// ------------------------------------------------------------------ icons
function drawBridge(x, y, w, h) {
  // suspension bridge over water, at dusk
  rect(x, y, w, h, [214, 226, 235]);
  for (let i = 0; i < 3; i++) rect(x + 8 + i * 26, y + h - 26 - i * 4, w - 16 - i * 52, 3, [120, 150, 180]);
  rect(x + 14, y + 18, 8, h - 40, RED);
  rect(x + w - 22, y + 18, 8, h - 40, RED);
  line(x + 18, y + 20, x + Math.floor(w / 2), y + 58, RED, 2);
  line(x + w - 18, y + 20, x + Math.floor(w / 2), y + 58, RED, 2);
  for (let i = 0; i <= 8; i++) {
    const vx = x + 18 + Math.floor(((w - 36) * i) / 8);
    const vy = y + 20 + Math.round(38 * Math.sin((Math.PI * i) / 8));
    line(vx, vy, vx, y + h - 30, RED, 1);
  }
  hline(x, y + h - 30, w, INK, 4);
  hline(x, y + h - 16, w, NAVY, 3);
  hline(x, y + h - 8, w, NAVY, 2);
}
function drawRadar(x, y, w, h) {
  rect(x, y, w, h, [18, 32, 22]);
  circle(x + Math.floor(w / 2), y + Math.floor(h / 2) + 6, 34, [70, 160, 90], false);
  circle(x + Math.floor(w / 2), y + Math.floor(h / 2) + 6, 22, [70, 160, 90], false);
  line(x + Math.floor(w / 2), y + Math.floor(h / 2) + 6, x + w - 14, y + 16, [120, 220, 140], 2);
  circle(x + Math.floor(w / 2), y + Math.floor(h / 2) + 6, 4, [160, 240, 170]);
  // small drone
  const dx = x + w - 26;
  const dy = y + 20;
  rect(dx - 8, dy - 2, 16, 4, WHITE);
  rect(dx - 2, dy - 8, 4, 16, WHITE);
  circle(dx - 10, dy - 6, 3, WHITE);
  circle(dx + 10, dy - 6, 3, WHITE);
}
function drawChip(x, y, w, h) {
  rect(x, y, w, h, [24, 32, 44]);
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);
  for (let i = 0; i < 5; i++) {
    hline(x + 6, y + 12 + i * 12, 8, GOLD, 3);
    hline(x + w - 14, y + 12 + i * 12, 8, GOLD, 3);
  }
  rect(cx - 26, cy - 26, 52, 52, [16, 90, 60]);
  rect(cx - 20, cy - 20, 40, 40, [24, 140, 100]);
  rect(cx - 8, cy - 8, 16, 16, GOLD);
  drawText(cx - 24, cy + 30, 'AI', 2, [140, 220, 180]);
}
function drawCricket(x, y, w, h) {
  rect(x, y, w, h, [30, 80, 40]);
  // pitch stripes
  for (let i = 0; i < 4; i++) hline(x, y + 14 + i * 18, w, [46, 110, 56], 6);
  // bat: handle + blade as two thick strokes
  line(x + 36, y + 16, x + 56, y + 50, [210, 170, 90], 4);
  line(x + 56, y + 50, x + 76, y + 82, [210, 170, 90], 11);
  // ball
  circle(x + 84, y + 26, 10, RED);
  line(x + 76, y + 20, x + 92, y + 32, WHITE, 1);
}

// =================================================================== page
fill(PAPER);

// frame
rect(0, 0, W, 10, INK);
rect(0, H - 10, W, 10, INK);
rect(0, 0, 10, H, INK);
rect(W - 10, 0, 10, H, INK);

// ---- masthead
drawTextCentered(512, 34, 'THE WORLD IN ONE DAY', 6, INK);
hline(32, 92, 440, INK, 2);
drawTextCentered(512, 100, 'WEDNESDAY, 18 NOVEMBER 2026', 3, RED);
hline(552, 92, 440, INK, 2);
drawTextCentered(512, 128, 'ONE DAY. FIVE STORIES. THE WORLD, IN A SINGLE PAGE.', 2, MUTED);
hline(32, 152, 960, INK, 5);
hline(32, 161, 960, INK, 1);

// ---- lead story: Quad summit, Manila
drawText(32, 180, 'LEAD STORY  -  MANILA, PHILIPPINES', 2, RED);
drawText(32, 208, 'QUAD LEADERS MEET IN MANILA', 4, INK);
drawWrapped(
  32,
  252,
  'Trump joins Modi, Takaichi and Albanese for Quad talks: a new maritime exercise, AI and cyber pacts, and a closing ASEAN summit.',
  2,
  640,
  INK,
  5,
);
// flag chips
const flags = [
  ['USA', flagUSA],
  ['INDIA', flagIndia],
  ['JAPAN', flagJapan],
  ['AUSTRALIA', flagAustralia],
];
flags.forEach(([name, fn], i) => {
  const fx = 700 + i * 76;
  fn(fx, 208, 64, 42);
  drawText(fx, 256, name, 1, MUTED);
});
hline(32, 316, 960, INK, 1);

// ---- middle row: two stories
const colW = 464;
const colX = [32, 528];
const midY = 336;

// story 2 — Ukraine / Crimean bridge
drawBridge(colX[0], midY, 150, 92);
drawText(colX[0] + 166, midY + 2, 'WAR IN EUROPE', 2, RED);
drawWrapped(colX[0] + 166, midY + 26, 'UKRAINE HITS CRIMEAN BRIDGE', 3, 300, INK, 3);
drawWrapped(
  colX[0],
  midY + 108,
  'Kyiv damages the Kerch bridge in a combined missile and drone strike; Russia answers by pounding bridges in Kyiv.',
  2,
  colW,
  INK,
  5,
);

// story 3 — Iran / Bahrain
drawRadar(colX[1], midY, 150, 92);
drawText(colX[1] + 166, midY + 2, 'GULF TENSIONS', 2, RED);
drawWrapped(colX[1] + 166, midY + 26, 'IRAN DRONE STRIKE ON US RADAR IN BAHRAIN', 3, 300, INK, 3);
drawWrapped(
  colX[1],
  midY + 108,
  "The IRGC claims a drone attack on a US radar at Bahrain's Sheikh Isa base - the third strike on the country in five days.",
  2,
  colW,
  INK,
  5,
);
hline(32, 560, 960, INK, 1);

// ---- lower row: two stories
const lowY = 580;

// story 4 — Nvidia
drawChip(colX[0], lowY, 150, 92);
drawText(colX[0] + 166, lowY + 2, 'TECH', 2, RED);
drawWrapped(colX[0] + 166, lowY + 26, 'NVIDIA: HUANG OUT, BOARD SAYS NO RETURN', 3, 300, INK, 3);
drawWrapped(
  colX[0],
  lowY + 108,
  'Jensen Huang steps down as CEO after an affair with a suspected Chinese spy; the board rules out his return as revenue jumps 103%.',
  2,
  colW,
  INK,
  5,
);

// story 5 — Dhoni
drawCricket(colX[1], lowY, 150, 92);
drawText(colX[1] + 166, lowY + 2, 'SPORT', 2, RED);
drawWrapped(colX[1] + 166, lowY + 26, 'DHONI RETIRES FROM THE IPL', 3, 300, INK, 3);
drawWrapped(
  colX[1],
  lowY + 108,
  'Chennai Super Kings great MS Dhoni ends his playing career and returns as the franchise mentor for the 2027 season.',
  2,
  colW,
  INK,
  5,
);
hline(32, 804, 960, INK, 1);

// ---- bottom ticker
rect(32, 824, 960, 168, NAVY);
drawText(52, 844, 'ALSO TODAY', 3, GOLD);
drawWrapped(
  52,
  884,
  'US LOSES MEASLES-FREE STATUS IN WORST OUTBREAK SINCE 1991  -  MONGOLIA PRESIDENT RESIGNS AMID GRAFT CHARGES  -  RUSSIAN MILITARY PLANE CRASHES IN SIBERIA, 19 KILLED  -  CYCLONE AKVAN NEARS INDIA EAST COAST',
  2,
  920,
  WHITE,
  6,
);
drawTextCentered(512, 998, 'SOURCES: WIRE REPORTS FROM 18 NOVEMBER 2026', 1, MUTED);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePNG(W, H, buf));
