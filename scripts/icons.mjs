// Draws the app icons (the heartbeat mark in white on ink) as PNGs. No image libraries needed.
//   node scripts/icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const INK = [28, 29, 31];
// The mark from src/client/components/Shell.tsx (viewBox 24 x 20).
const MARK = [[1, 11], [6, 11], [8.2, 5], [11.8, 16], [14.4, 8], [16, 11], [23, 11]];

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * size: output px. markWidth: fraction of the icon the mark spans. radius: corner radius fraction
 * (0 = full bleed). background: false for a transparent monochrome badge.
 */
function draw(size, { markWidth, radius, background = true }) {
  const scale = (size * markWidth) / 22; // mark spans x 1..23
  const ox = (size - 22 * scale) / 2 - 1 * scale;
  const oy = (size - 11 * scale) / 2 - 5 * scale; // mark spans y 5..16
  const half = (1.9 * scale) / 2;
  const r = radius * size;
  const px = new Uint8Array(size * size * 4);
  const S = 4; // 4x4 supersampling
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0, fg = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const fx = x + (sx + 0.5) / S, fy = y + (sy + 0.5) / S;
          const cx = Math.max(r, Math.min(size - r, fx)), cy = Math.max(r, Math.min(size - r, fy));
          const inside = Math.hypot(fx - cx, fy - cy) <= r || r === 0;
          if (!inside) continue;
          bg++;
          const mx = (fx - ox) / scale, my = (fy - oy) / scale;
          let d = Infinity;
          for (let i = 0; i < MARK.length - 1; i++) d = Math.min(d, distToSegment(mx, my, MARK[i], MARK[i + 1]));
          if (d * scale <= half) fg++;
        }
      }
      const i = (y * size + x) * 4;
      const a = bg / (S * S), f = bg ? fg / bg : 0;
      if (background) {
        for (let c = 0; c < 3; c++) px[i + c] = Math.round(INK[c] * (1 - f) + 255 * f);
        px[i + 3] = Math.round(a * 255);
      } else {
        px[i] = px[i + 1] = px[i + 2] = 255;
        px[i + 3] = Math.round(f * a * 255);
      }
    }
  }
  return png(size, size, px);
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("public/icons", { recursive: true });
const out = {
  "icon-192.png": draw(192, { markWidth: 0.62, radius: 0.22 }),
  "icon-512.png": draw(512, { markWidth: 0.62, radius: 0.22 }),
  "maskable-512.png": draw(512, { markWidth: 0.5, radius: 0 }),
  "apple-touch-icon.png": draw(180, { markWidth: 0.58, radius: 0 }),
  "badge-96.png": draw(96, { markWidth: 0.8, radius: 0, background: false }),
  "favicon-32.png": draw(32, { markWidth: 0.72, radius: 0.22 }),
};
for (const [name, buf] of Object.entries(out)) writeFileSync(`public/icons/${name}`, buf);
console.log(Object.keys(out).join(", "));
