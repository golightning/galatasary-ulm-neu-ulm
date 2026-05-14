const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type);
  const crc = zlib.crc32(Buffer.concat([typeB, data]));
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function createPNG(w, h) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type RGB
  const ihdr = makeChunk("IHDR", ihdrData);

  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // no filter
    for (let x = 0; x < w; x++) {
      const offset = y * (1 + w * 3) + 1 + x * 3;
      raw[offset] = 227;     // R (Galatasaray red)
      raw[offset + 1] = 10;  // G
      raw[offset + 2] = 23;  // B
    }
  }
  const idat = makeChunk("IDAT", zlib.deflateSync(raw));
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const modelDir = path.resolve(__dirname, "..", "pass-model");

const assets = [
  ["icon.png", 29, 29],
  ["icon@2x.png", 58, 58],
  ["logo.png", 160, 50],
  ["logo@2x.png", 320, 100],
];

for (const [name, w, h] of assets) {
  const filePath = path.join(modelDir, name);
  fs.writeFileSync(filePath, createPNG(w, h));
  console.log(`  ✓ ${name} (${w}x${h}) — ${fs.statSync(filePath).size} bytes`);
}

console.log("\nPass-Model Assets erstellt in", modelDir);
