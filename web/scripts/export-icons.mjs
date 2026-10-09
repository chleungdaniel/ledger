/**
 * Rasterise public/icon-master.svg (+ maskable) into PWA / favicon assets.
 * Run: node scripts/export-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import toIco from "to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const iconsDir = join(publicDir, "icons");

function pngFromSvg(svgPath, width) {
  const svg = readFileSync(svgPath, "utf8");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "transparent",
  });
  return resvg.render().asPng();
}

function writePng(svgPath, outPath, width) {
  writeFileSync(outPath, pngFromSvg(svgPath, width));
  console.log(`wrote ${outPath} (${width}px)`);
}

const master = join(publicDir, "icon-master.svg");
const maskable = join(publicDir, "icon-maskable.svg");

writePng(master, join(publicDir, "apple-touch-icon.png"), 180);
writePng(master, join(iconsDir, "icon-192.png"), 192);
writePng(master, join(iconsDir, "icon-512.png"), 512);
writePng(maskable, join(iconsDir, "icon-512-maskable.png"), 512);

const favicon32 = pngFromSvg(master, 32);
writeFileSync(join(publicDir, "favicon-32.png"), favicon32);
writeFileSync(join(publicDir, "favicon.ico"), await toIco([favicon32]));
console.log("wrote favicon-32.png, favicon.ico");
