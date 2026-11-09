#!/usr/bin/env node
/**
 * Generates every raster icon from the single source logo (public/logo.svg):
 *   public/icons/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
 *   src/app/icon.svg (favicon, copied)
 *   capacitor-www/logo.svg (Android offline fallback)
 *   assets/icon-only.png, icon-foreground.png, icon-background.png, splash.png, splash-dark.png
 *     -> consumed by `npm run android:assets` (@capacitor/assets) to create Android launcher icons & splash.
 *
 * Usage: npm run icons            (after replacing public/logo.svg)
 * Optional: LOGO_BG="#0b1220" npm run icons   (background colour for maskable/adaptive icons)
 */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
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

copyFileSync(src, join(root, "src/app/icon.svg"));
copyFileSync(src, join(root, "capacitor-www/logo.svg"));
console.log("✓ src/app/icon.svg, capacitor-www/logo.svg");
console.log("\nDone. For Android run: npm run android:assets && npx cap sync android");
