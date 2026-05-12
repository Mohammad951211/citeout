import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, "../extension/icons/icon.svg");
const svg = readFileSync(svgPath);

// Extension icons
const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const out = join(__dirname, `../extension/icons/icon${size}.png`);
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log(`Generated extension/icons/icon${size}.png`);
}

// Website favicon — overwrite favicon.ico with PNG bytes (accepted by all modern browsers)
await sharp(svg).resize(32, 32).png().toFile(join(__dirname, "../app/favicon.ico"));
console.log("Generated app/favicon.ico");

// Also write app/icon.png for Next.js file-based icon convention
await sharp(svg).resize(256, 256).png().toFile(join(__dirname, "../app/icon.png"));
console.log("Generated app/icon.png");

console.log("Done.");
