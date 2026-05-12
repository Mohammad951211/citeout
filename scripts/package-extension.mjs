import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const bestzip = require("bestzip");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const extensionDir = path.join(projectRoot, "extension");
const outputDir = path.join(projectRoot, "public", "extension");
const outputZip = path.join(outputDir, "citeout-extension.zip");

async function main() {
  await mkdir(outputDir, { recursive: true });
  await rm(outputZip, { force: true });

  await bestzip({
    cwd: extensionDir,
    source: ["*"],
    destination: outputZip,
  });

  console.log(`Extension packaged: ${outputZip}`);
}

main().catch((error) => {
  console.error("Failed to package extension:", error);
  process.exit(1);
});
