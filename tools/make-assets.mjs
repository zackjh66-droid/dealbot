// Generates Project Zero PNG assets with no external dependencies.
// Usage: node tools/make-assets.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OUT = join(process.cwd(), 'launcher', 'ProjectZero', 'Assets');
mkdirSync(OUT, { recursive: true });

const INK = [6, 5, 10];
const VIOLET = [139, 92, 246];
const VIOLET_LIGHT = [196, 161, 255];
const GOLD = [242, 196, 90];

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function writePng(path, width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
  writeFileSync(path, png);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function render(w, h, draw) {
  const S = 3;
  const W = w * S;
  const H = h * S;
  const buf = new Float32Array(W * H * 3);
  // base ink + diagonal gradient + glow
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const t = Math.min(1, Math.max(0, (x / W) * 0.55 + (y / H) * 0.45));
      let c = mix([11, 7, 22], INK, t);
      const dx = x / W - 0.78;
      const dy = y / H - 0.16;
      const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 0.62);
      c = mix(c, [58, 32, 112], Math.pow(glow, 2.2) * 0.9);
      const idx = (y * W + x) * 3;
      buf[idx] = c[0];
      buf[idx + 1] = c[1];
      buf[idx + 2] = c[2];
    }
  }
  draw({ buf, W, H, S });

  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < S; sy += 1) {
        for (let sx = 0; sx < S; sx += 1) {
          const idx = ((y * S + sy) * W + (x * S + sx)) * 3;
          r += buf[idx];
          g += buf[idx + 1];
          b += buf[idx + 2];
        }
      }
      const n = S * S;
      const o = (y * w + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = 255;
    }
  }
  return out;
}

function blend(buf, W, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= W) return;
  const idx = (y * W + x) * 3;
  if (idx < 0 || idx + 2 >= buf.length) return;
  buf[idx] = lerp(buf[idx], color[0], alpha);
  buf[idx + 1] = lerp(buf[idx + 1], color[1], alpha);
  buf[idx + 2] = lerp(buf[idx + 2], color[2], alpha);
}

function line(buf, W, H, x1, y1, x2, y2, width, color, alpha = 1) {
  const minX = Math.max(0, Math.floor(Math.min(x1, x2) - width));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(x1, x2) + width));
  const minY = Math.max(0, Math.floor(Math.min(y1, y2) - width));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(y1, y2) + width));
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let t = ((x - x1) * dx + (y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = x1 + t * dx;
      const py = y1 + t * dy;
      const d = Math.hypot(x - px, y - py);
      const edge = Math.max(0, Math.min(1, width / 2 + 0.7 - d));
      if (edge > 0) blend(buf, W, x, y, color, alpha * edge);
    }
  }
}

function ring(buf, W, H, cx, cy, r, width, color, alpha = 1, from = 0, to = Math.PI * 2) {
  const outer = r + width;
  for (let y = Math.max(0, Math.floor(cy - outer)); y <= Math.min(H - 1, Math.ceil(cy + outer)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - outer)); x <= Math.min(W - 1, Math.ceil(cx + outer)); x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      let angle = Math.atan2(y - cy, x - cx);
      if (angle < 0) angle += Math.PI * 2;
      let inside = from <= to ? angle >= from && angle <= to : angle >= from || angle <= to;
      if (!inside) continue;
      const edge = Math.max(0, Math.min(1, Math.min(width / 2 + 0.7 - Math.abs(d - r), r + width / 2 - d)));
      if (edge > 0) blend(buf, W, x, y, color, alpha * edge);
    }
  }
}

function hexMark(buf, W, H, cx, cy, r, thickness) {
  const pts = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  for (let i = 0; i < 6; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % 6];
    line(buf, W, H, a[0], a[1], b[0], b[1], thickness, VIOLET_LIGHT, 0.55);
  }
  ring(buf, W, H, cx, cy, r * 0.52, thickness * 1.5, VIOLET_LIGHT, 0.95, Math.PI * 1.889, Math.PI * 1.611);
  line(buf, W, H, cx + r * 0.26, cy - r * 0.30, cx + r * 0.44, cy - r * 0.48, thickness * 1.9, GOLD, 1);
}

function tileDraw({ markScale = 0.52, markY = 0.5 } = {}) {
  return ({ buf, W, H }) => {
    const r = Math.min(W, H) * markScale * 0.5;
    hexMark(buf, W, H, W * 0.5, H * markY, r, Math.max(2 * 3, r * 0.035));
    line(buf, W, H, 0, H * 0.86, W, H * 0.72, 1.4 * 3, VIOLET, 0.35);
    line(buf, W, H, 0, H * 0.9, W, H * 0.78, 0.9 * 3, GOLD, 0.3);
  };
}

function splashDraw() {
  return ({ buf, W, H }) => {
    const r = Math.min(W, H) * 0.34;
    hexMark(buf, W, H, W * 0.18, H * 0.5, r, Math.max(2 * 3, r * 0.028));
    for (let i = 0; i < 4; i += 1) {
      const x = W * (0.52 + i * 0.11);
      line(buf, W, H, x, H, x + W * 0.18, 0, 1.2 * 3, VIOLET, 0.18);
    }
    line(buf, W, H, W * 0.38, H * 0.92, W, H * 0.92, 1 * 3, GOLD, 0.35);
  };
}

const files = [
  ['StoreLogo.png', 50, 50, tileDraw(50, 50, { markScale: 0.62 })],
  ['StoreLogo.scale-200.png', 100, 100, tileDraw(100, 100, { markScale: 0.62 })],
  ['Square44x44Logo.png', 44, 44, tileDraw(44, 44, { markScale: 0.66 })],
  ['Square44x44Logo.scale-200.png', 88, 88, tileDraw(88, 88, { markScale: 0.66 })],
  ['Square150x150Logo.png', 150, 150, tileDraw(150, 150)],
  ['Square150x150Logo.scale-200.png', 300, 300, tileDraw(300, 300)],
  ['Square310x310Logo.png', 310, 310, tileDraw(310, 310, { markScale: 0.5 })],
  ['Square310x310Logo.scale-200.png', 620, 620, tileDraw(620, 620, { markScale: 0.5 })],
  ['Wide310x150Logo.png', 310, 150, tileDraw(310, 150, { markScale: 0.42, markY: 0.5 })],
  ['Wide310x150Logo.scale-200.png', 620, 300, tileDraw(620, 300, { markScale: 0.42, markY: 0.5 })],
  ['SplashScreen.png', 620, 300, splashDraw()],
  ['SplashScreen.scale-200.png', 1240, 600, splashDraw()]
];

for (const [name, w, h, draw] of files) {
  const png = render(w, h, draw);
  writePng(join(OUT, name), w, h, png);
  console.log('wrote', name, `${w}x${h}`);
}
