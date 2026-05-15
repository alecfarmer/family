#!/usr/bin/env node
// Generates placeholder PNG icons for the PWA manifest.
// Track I will replace these with production FamilyMark artwork.
//
// Strategy: build minimal valid PNGs using raw chunk construction
// with Node's built-in zlib — no canvas or native dependencies.

import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

function crc32(buf) {
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })();
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

/**
 * Build a minimal 1-bit-depth PNG filled with a single RGBA color.
 * Uses true-color RGBA (colorType=6) for broadest compatibility.
 */
function buildPng(size, r, g, b, a = 255) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width, height, bitDepth=8, colorType=6 (RGBA), compress=0, filter=0, interlace=0
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw image data: filter byte (0) + RGBA × size per row, size rows
  const rowLen = 1 + size * 4;
  const raw = Buffer.allocUnsafe(size * rowLen);
  for (let y = 0; y < size; y++) {
    const base = y * rowLen;
    raw[base] = 0; // filter type None
    for (let x = 0; x < size; x++) {
      const off = base + 1 + x * 4;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a;
    }
  }

  const compressed = deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Dark background (#0F0D0B) placeholder icons — matches app theme.
const R = 0x0f, G = 0x0d, B = 0x0b;

writeFileSync(join(PUBLIC, "icon-192.png"), buildPng(192, R, G, B));
writeFileSync(join(PUBLIC, "icon-512.png"), buildPng(512, R, G, B));
writeFileSync(join(PUBLIC, "apple-touch-icon.png"), buildPng(180, R, G, B));

console.log("Placeholder icons written to public/:");
console.log("  icon-192.png (192×192)");
console.log("  icon-512.png (512×512)");
console.log("  apple-touch-icon.png (180×180)");
console.log("NOTE: Replace with FamilyMark artwork in Track I.");
