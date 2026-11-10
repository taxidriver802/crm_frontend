/**
 * Every Joist icon file is generated from one drawing:
 *
 *   src/assets/brand/joist-mark.svg      the source (edit only this)
 *
 * and written to:
 *
 *   src/app/icon.svg                     browser tab, vector
 *   src/app/favicon.ico                  browser tab fallback (16, 32, 48)
 *   public/icons/icon-192.svg|png        installed app, purpose "any"
 *   public/icons/icon-512.svg|png        installed app, purpose "any"
 *   src/app/apple-icon.png               iOS home screen, 180, full bleed
 *   public/icons/icon-512-maskable.png   Android adaptive, full bleed,
 *                                        mark scaled to 80% of the tile
 *   public/offline.html                  inline copy between the
 *                                        joist-mark:start / :end markers
 *
 *   npm run icons:pwa             write them
 *   npm run icons:pwa -- --check  exit 1 if any written file has drifted
 *
 * The rounded tile is part of the drawing. iOS and Android apply their own
 * mask, so their files fill the square (no rx) and Android's keeps the mark
 * inside the 40%-radius safe circle.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "src", "assets", "brand", "joist-mark.svg");
const MASKABLE_SCALE = 0.8;
const OFFLINE_START = "<!-- joist-mark:start -->";
const OFFLINE_END = "<!-- joist-mark:end -->";
const check = process.argv.includes("--check");

const source = (await readFile(SOURCE, "utf8")).trim() + "\n";
for (const hook of ['class="joist-tile"', 'class="joist-flange"', 'class="joist-web"', 'rx="']) {
  if (!source.includes(hook)) {
    throw new Error(`${path.relative(root, SOURCE)} is missing ${hook}`);
  }
}

/** The drawing at a fixed pixel size. */
function sized(svg, size) {
  return svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
}

/** Square tile for platforms that mask the icon themselves. */
function fullBleed(svg) {
  return svg.replace(/ rx="[^"]*"/, "");
}

/** Full bleed, with the glyph pulled in toward the centre. */
function maskable(svg) {
  const tileEnd = svg.indexOf("/>", svg.indexOf('class="joist-tile"')) + 2;
  const close = svg.lastIndexOf("</svg>");
  const offset = (16 * (1 - MASKABLE_SCALE)).toFixed(1);
  return (
    fullBleed(svg.slice(0, tileEnd)) +
    `\n  <g transform="translate(${offset} ${offset}) scale(${MASKABLE_SCALE})">` +
    svg.slice(tileEnd, close).replace(/\n  /g, "\n    ").replace(/\n$/, "") +
    "\n  </g>\n</svg>\n"
  );
}

async function png(svg, size) {
  // Drawn at its own pixel size: the shapes sit on even units of the
  // 32-unit grid, so their edges land on whole pixels down to 16px.
  return sharp(Buffer.from(sized(svg, size))).png({ compressionLevel: 9 }).toBuffer();
}

/** PNG-in-ICO: every current browser reads it. */
function ico(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  const entries = [];
  let offset = 6 + 16 * frames.length;
  for (const { size, data } of frames) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...frames.map((f) => f.data)]);
}

function inlineForOffline(html) {
  const start = html.indexOf(OFFLINE_START);
  const end = html.indexOf(OFFLINE_END);
  if (start < 0 || end < start) {
    throw new Error(`public/offline.html needs ${OFFLINE_START} … ${OFFLINE_END}`);
  }
  const indent = html.slice(html.lastIndexOf("\n", start) + 1, start);
  const drawing = sized(source.trim(), 40)
    .replace("<svg ", '<svg class="mark" aria-hidden="true" focusable="false" ')
    .split("\n")
    .join(`\n${indent}`);
  return (
    html.slice(0, start + OFFLINE_START.length) +
    `\n${indent}${drawing}\n${indent}` +
    html.slice(end)
  );
}

const outputs = [
  ["src/app/icon.svg", source],
  ["public/icons/icon-192.svg", sized(source, 192)],
  ["public/icons/icon-512.svg", sized(source, 512)],
  ["public/icons/icon-192.png", await png(source, 192)],
  ["public/icons/icon-512.png", await png(source, 512)],
  ["src/app/apple-icon.png", await png(fullBleed(source), 180)],
  ["public/icons/icon-512-maskable.png", await png(maskable(source), 512)],
  [
    "src/app/favicon.ico",
    ico(
      await Promise.all(
        [16, 32, 48].map(async (size) => ({ size, data: await png(source, size) })),
      ),
    ),
  ],
  [
    "public/offline.html",
    inlineForOffline(await readFile(path.join(root, "public", "offline.html"), "utf8")),
  ],
];

let drift = 0;
for (const [relative, content] of outputs) {
  const dest = path.join(root, relative);
  const next = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  if (check) {
    let current = null;
    try {
      current = await readFile(dest);
    } catch {
      // missing counts as drift
    }
    if (!current || !current.equals(next)) {
      drift += 1;
      console.error(`drifted from ${path.relative(root, SOURCE)}: ${relative}`);
    }
    continue;
  }
  await writeFile(dest, next);
  console.log(`wrote ${relative}`);
}

if (check) {
  if (drift) {
    console.error(`${drift} file(s) differ. Run: npm run icons:pwa`);
    process.exit(1);
  }
  console.log(`${outputs.length} brand files match ${path.relative(root, SOURCE)}`);
}
