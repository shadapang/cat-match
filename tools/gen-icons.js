#!/usr/bin/env node
// 生成 PWA 图标 192/512：奶油底 + 简化猫脸（纯 Node 无外部依赖，自编码 PNG）
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePNG(size, pixelFn) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      const o = y * (1 + size * 4) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const idat = deflateSync(raw);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const v0x = cx - ax, v0y = cy - ay, v1x = bx - ax, v1y = by - ay, v2x = px - ax, v2y = py - ay;
  const u = (v2x * v0y - v2y * v0x) / (v1x * v0y - v1y * v0x);
  const w = (v1x * v2y - v1y * v2x) / (v0x * v0y - v0y * v0x);
  return u >= 0 && w >= 0 && u + w <= 1;
}

function catIcon(size) {
  const cx = size / 2, R = size * 0.46;
  const hx = cx, hy = cx * 0.98;
  const headR = size * 0.22;
  const earW = headR * 0.55, earH = size * 0.14;
  const earL = { a: hx - headR * 0.75, b: hx - headR * 0.15, c: hx - headR * 0.55 };
  const earR = { a: hx + headR * 0.75, b: hx + headR * 0.15, c: hx + headR * 0.55 };
  const eyeR = headR * 0.14, noseR = headR * 0.12;
  return encodePNG(size, (x, y) => {
    if (Math.hypot(x - cx, y - cx) > R) return [0, 0, 0, 0];
    let [r, g, b] = [250, 246, 239]; // 奶油底
    const inHead = (px, py) => Math.hypot(px - hx, py - hy) <= headR;
    if (inHead(x, y)) [r, g, b] = [192, 57, 43]; // 红猫脸
    const earTop = hy - headR * 0.75;
    if (inTriangle(x, y, earL.a, earTop, earL.b, earTop, earL.c, earTop + earH) ||
        inTriangle(x, y, earR.a, earTop, earR.b, earTop, earR.c, earTop + earH)) [r, g, b] = [192, 57, 43];
    for (const sgn of [-1, 1])
      if (Math.hypot(x - (hx + sgn * headR * 0.42), y - (hy - headR * 0.08)) <= eyeR) [r, g, b] = [43, 29, 20];
    if (Math.hypot(x - hx, y - (hy + headR * 0.34)) <= noseR) [r, g, b] = [255, 255, 255];
    return [r, g, b, 255];
  });
}

for (const size of [192, 512]) {
  const buf = catIcon(size);
  writeFileSync(`public/icons/icon-${size}.png`, buf);
  console.log(`icon-${size}.png written, ${buf.length} bytes`);
}
