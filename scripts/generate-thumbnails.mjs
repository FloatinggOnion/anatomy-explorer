#!/usr/bin/env node
/**
 * generate-thumbnails.mjs
 * Generates minimal valid 64x64 solid-color PNG files for model gallery thumbnails.
 * Uses only Node.js built-in modules (zlib, fs, path).
 */

import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'models');

/** Write a 4-byte big-endian uint32 to a buffer at offset */
function writeUint32(buf, offset, value) {
  buf[offset]     = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8)  & 0xff;
  buf[offset + 3] =  value         & 0xff;
}

/** Compute CRC32 of a buffer (for PNG chunk verification) */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Build a PNG chunk: 4-byte length + 4-byte type + data + 4-byte CRC */
function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  writeUint32(len, 0, data.length);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const crcBytes = Buffer.alloc(4);
  writeUint32(crcBytes, 0, crc32(crcBuf));
  return Buffer.concat([len, typeBytes, data, crcBytes]);
}

/**
 * Generate a minimal valid 64x64 solid-color RGB PNG.
 * @param {[number, number, number]} rgb - RGB values 0-255
 * @returns {Buffer} PNG file bytes
 */
function generateSolidPNG(rgb) {
  const WIDTH = 64;
  const HEIGHT = 64;

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width(4) height(4) bitDepth(1) colorType(1=2=RGB) compression(1) filter(1) interlace(1)
  const ihdrData = Buffer.alloc(13);
  writeUint32(ihdrData, 0, WIDTH);
  writeUint32(ihdrData, 4, HEIGHT);
  ihdrData[8]  = 8; // bit depth
  ihdrData[9]  = 2; // color type: RGB
  ihdrData[10] = 0; // compression method: deflate
  ihdrData[11] = 0; // filter method: adaptive
  ihdrData[12] = 0; // interlace: none
  const ihdr = pngChunk('IHDR', ihdrData);

  // Raw image data: each row = 1 filter byte (0=None) + WIDTH * 3 RGB bytes
  const rowSize = 1 + WIDTH * 3;
  const rawData = Buffer.alloc(HEIGHT * rowSize);
  for (let y = 0; y < HEIGHT; y++) {
    const base = y * rowSize;
    rawData[base] = 0; // filter type: None
    for (let x = 0; x < WIDTH; x++) {
      const off = base + 1 + x * 3;
      rawData[off]     = rgb[0];
      rawData[off + 1] = rgb[1];
      rawData[off + 2] = rgb[2];
    }
  }

  const idat = pngChunk('IDAT', deflateSync(rawData, { level: 6 }));
  const iend = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Generate thumbnails
mkdirSync(OUTPUT_DIR, { recursive: true });

// skeleton-thumb.png: ivory #e8dcc8 — matches skeleton BoneMesh color from Phase 2
writeFileSync(join(OUTPUT_DIR, 'skeleton-thumb.png'), generateSolidPNG([0xe8, 0xdc, 0xc8]));
console.log('Generated: public/models/skeleton-thumb.png (ivory #e8dcc8)');

// body-thumb.png: muted blue #a8c4d4 — body model placeholder color
writeFileSync(join(OUTPUT_DIR, 'body-thumb.png'), generateSolidPNG([0xa8, 0xc4, 0xd4]));
console.log('Generated: public/models/body-thumb.png (muted blue #a8c4d4)');

console.log('Done.');
