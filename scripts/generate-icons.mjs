#!/usr/bin/env node
/**
 * Generates every raster icon from the single source logo (public/logo.svg):
 *   public/icons/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
 *   public/favicon.ico (16/32/48 px) + public/icons/favicon-16.png, favicon-32.png (browser tab)
 *   capacitor-www/logo.svg (Android offline fallback)
 *   assets/icon-only.png, icon-foreground.png, icon-background.png, splash.png, splash-dark.png
 *     -> consumed by `npm run android:assets` (@capacitor/assets) to create Android launcher icons & splash.
 *
 * Usage: npm run icons            (after replacing public/logo.svg)
 * Optional: LOGO_BG="#0b1220" npm run icons   (background colour for maskable/adaptive icons)
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public", "logo.svg");
const svg = readFileSync(src);
const BG = process.env.LOGO_BG || "#ffffff";
const BG_DARK = process.env.LOGO_BG_DARK || "#050c1b";

for (const d of ["public/icons", "assets"]) mkdirSync(join(root, d), { recursive: true });

/** Render the logo at `size` px, optionally centred on a padded background. */
async function render(out, size, { padding = 0, background } = {}) {
  const inner = Math.round(size * (1 - padding * 2));
  const logo = await sharp(svg, { density: 384 }).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(join(root, out));
  console.log("✓", out);
}

await render("public/icons/icon-192.png", 192);
await render("public/icons/icon-512.png", 512);
await render("public/icons/icon-maskable-512.png", 512, { padding: 0.12, background: BG }); // safe zone
await render("public/icons/apple-touch-icon.png", 180, { padding: 0.08, background: BG });

// Capacitor assets (see https://capacitorjs.com/docs/guides/splash-screens-and-icons)
await render("assets/icon-only.png", 1024, { padding: 0.1, background: BG });
await render("assets/icon-foreground.png", 1024, { padding: 0.22 }); // adaptive icon foreground (transparent)
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } }).png().toFile(join(root, "assets/icon-background.png"));
console.log("✓ assets/icon-background.png");
await render("assets/splash.png", 2732, { padding: 0.4, background: BG });
await render("assets/splash-dark.png", 2732, { padding: 0.4, background: BG_DARK });

// Browser-tab favicons: PNGs + a multi-size .ico (PNG-compressed entries).
const icoSizes = [16, 32, 48];
const icoPngs = [];
for (const s of icoSizes) {
  const buf = await sharp(svg, { density: 384 }).resize(s, s, { kernel: "lanczos3" }).png().toBuffer();
  icoPngs.push(buf);
  if (s !== 48) writeFileSync(join(root, `public/icons/favicon-${s}.png`), buf);
}
const header = Buffer.alloc(6 + icoSizes.length * 16);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
icoSizes.forEach((s, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(s, e); // width
  header.writeUInt8(s, e + 1); // height
  header.writeUInt16LE(1, e + 4); // colour planes
  header.writeUInt16LE(32, e + 6); // bits per pixel
  header.writeUInt32LE(icoPngs[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += icoPngs[i].length;
});
writeFileSync(join(root, "public/favicon.ico"), Buffer.concat([header, ...icoPngs]));
console.log("✓ public/favicon.ico, public/icons/favicon-16.png, favicon-32.png");

copyFileSync(src, join(root, "capacitor-www/logo.svg"));
console.log("✓ capacitor-www/logo.svg");
console.log("\nDone. For Android run: npm run android:assets && npx cap sync android");
