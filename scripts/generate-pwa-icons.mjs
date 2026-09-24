/**
 * Rasterize committed PWA PNGs from the existing SVG icons.
 * Maskable output adds safe-zone padding so Android adaptive masks do not crop the glyph.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = path.join(root, "public", "icons");
const ACCENT = "#f97316";
const MASKABLE_SCALE = 0.8;

async function pngFromSvg(svgName, size) {
  const raw = await readFile(path.join(iconsDir, svgName), "utf8");
  // Source SVGs use "--accent" inside comments, which is not well-formed XML.
  const svg = Buffer.from(raw.replace(/<!--[\s\S]*?-->/g, ""));
  return sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
}

async function writePng(filename, buffer) {
  const dest = path.join(iconsDir, filename);
  await sharp(buffer).png().toFile(dest);
  console.log(`wrote ${path.relative(root, dest)}`);
}

const icon192 = await pngFromSvg("icon-192.svg", 192);
const icon512 = await pngFromSvg("icon-512.svg", 512);
const apple = await pngFromSvg("icon-512.svg", 180);

const maskableInner = Math.round(512 * MASKABLE_SCALE);
const scaled = await sharp(icon512).resize(maskableInner, maskableInner).png().toBuffer();
const maskable = await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: ACCENT,
  },
})
  .composite([{ input: scaled, gravity: "center" }])
  .png()
  .toBuffer();

await writePng("icon-192.png", icon192);
await writePng("icon-512.png", icon512);
await writePng("apple-touch-icon.png", apple);
await writePng("icon-512-maskable.png", maskable);
