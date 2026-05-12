// Creates simple PNG icons for the CiteOut extension
// Uses pure Node.js to write minimal valid PNG files

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal PNG generator - creates a solid blue square with "CO" text (simplified)
function createPNG(size) {
  // We'll create a simple colored PNG using raw PNG format
  const CRC_TABLE = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    CRC_TABLE[i] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, "ascii");
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcInput = Buffer.concat([typeBytes, data]);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(crcInput));
    return Buffer.concat([len, typeBytes, data, crcVal]);
  }

  function adler32(buf) {
    let a = 1, b = 0;
    for (const byte of buf) {
      a = (a + byte) % 65521;
      b = (b + a) % 65521;
    }
    return (b << 16) | a;
  }

  function deflate(data) {
    // Use zlib deflate via Node built-in
    const zlib = require("zlib");
    return zlib.deflateSync(data);
  }

  // Brand blue: #2563EB = R:37, G:99, B:235
  const R = 37, G = 99, B = 235;

  // Create RGBA pixel data
  const pixels = [];
  for (let y = 0; y < size; y++) {
    pixels.push(0); // filter type: None
    for (let x = 0; x < size; x++) {
      // Simple brand blue fill with rounded corners effect
      const cx = x - size / 2;
      const cy = y - size / 2;
      const r = Math.sqrt(cx * cx + cy * cy);
      const cornerRadius = size * 0.2;
      // Check if in rounded rect
      const ax = Math.abs(cx);
      const ay = Math.abs(cy);
      const inRect =
        ax <= size / 2 && ay <= size / 2 &&
        (ax <= size / 2 - cornerRadius ||
          ay <= size / 2 - cornerRadius ||
          Math.sqrt((ax - (size / 2 - cornerRadius)) ** 2 + (ay - (size / 2 - cornerRadius)) ** 2) <= cornerRadius);
      if (inRect) {
        pixels.push(R, G, B, 255);
      } else {
        pixels.push(0, 0, 0, 0);
      }
    }
  }

  const pixelData = Buffer.from(pixels);

  // Compress with zlib
  const { deflateSync } = await import("zlib");

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = chunk(
    "IHDR",
    Buffer.from([
      0, 0, 0, size,  // width
      0, 0, 0, size,  // height
      8,              // bit depth
      6,              // color type: RGBA
      0, 0, 0,        // compression, filter, interlace
    ])
  );

  // We need to use require for synchronous deflate
  const { createRequire } = await import("module");
  const require = createRequire(import.meta.url);
  const zlib = require("zlib");
  const compressed = zlib.deflateSync(pixelData);
  const idat = chunk("IDAT", compressed);
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

async function main() {
  const sizes = [16, 32, 48, 128];
  for (const size of sizes) {
    const png = await createPNG(size);
    const path = resolve(__dirname, `../extension/icons/icon${size}.png`);
    writeFileSync(path, png);
    console.log(`Created icon${size}.png`);
  }
}

main().catch(console.error);
