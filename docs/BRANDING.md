# Branding: logo, icons and splash animation

Branding lives in **three places**:

| File | Controls |
|---|---|
| `public/logo.svg` | The logo everywhere: header, sidebar, login, splash, favicon, PWA icons and the Android app icon |
| `src/config/brand.ts` | App name, two-line wordmark, tagline, theme colour, and which splash animation to use and for how long |
| `src/app/globals.css` | Brand colours (`--brand-navy`, `--brand-blue`, `--brand-cyan`, `--brand-glow`) and the `bg-forge`, `text-forge` and `hex-pattern` utilities |

## Replace the logo

1. Export your logo as an **SVG**. A square viewBox works best, for example
   `viewBox="0 0 512 512"`.
2. Overwrite `public/logo.svg`. Keep the file name.
3. Regenerate every derived icon:

   ```bash
   npm run icons
   # optional: background colour for maskable/adaptive icons and the splash
   LOGO_BG="#ffffff" LOGO_BG_DARK="#0b1220" npm run icons
   ```

   This updates the following files:

   - `public/icons/*.png`: PWA and Apple touch icons
   - `src/app/icon.svg`: the browser favicon
   - `capacitor-www/logo.svg`: the Android offline page
   - `assets/*.png`: the sources for the Android icon and splash

4. Update the Android launcher icon and native splash:

   ```bash
   npm run android:assets
   npx cap sync android
   ```

   To change the background colours used for the Android icon and splash, edit the
   `android:assets` script in `package.json`.

5. Commit and push. Vercel redeploys the web app. Rebuild the APK so the new launcher icon
   appears.

### Starting from a PNG/JPG (how the current logo was made)

The current logo was built from a raster image with `scripts/build-logo.mjs`:

```bash
# source image, then the square crop box around the emblem: left top size (pixels)
node scripts/build-logo.mjs assets/brand/logo-source.jpg 478 92 446
npm run icons && npm run android:assets && npx cap sync android
```

The script crops the emblem, cleans the paper background to white, and writes:

- `public/brand/emblem.png`: the 1024px emblem used by the splash
- `public/logo.svg`: a rounded white tile with the emblem embedded

With a new image, adjust the three crop numbers until the emblem fills the square.

The logo is rendered by `src/components/brand/logo.tsx`. Its size is set per placement, and
`withText` adds the app name beside it.

## Replace the splash / loading animation

The in-app splash shows once per session by default. It is configured in
`src/config/brand.ts`:

```ts
splash: {
  type: "default",          // "default" | "image" | "video" | "custom"
  src: "/brand/splash.svg", // used by "image" and "video"
  minDurationMs: 1200,      // how long it stays visible
  oncePerSession: true,     // false = show on every full page load
  background: "hsl(var(--background))",
}
```

| Type | When to use | What to do |
|---|---|---|
| `default` | Built-in animated logo with a pulse ring | Nothing. Edit `components/brand/splash-animation.tsx` to tweak it. |
| `image` | Animated GIF, APNG or animated SVG | Put the file in `public/brand/` and set `src`. |
| `video` | MP4 or WebM, for example from After Effects | Put it in `public/brand/` and set `src`. It plays muted and inline. |
| `custom` | Lottie, Rive or a hand-coded animation | Edit `components/brand/custom-splash.tsx`. A Lottie example is in the comments there. |

For a **Lottie** animation:

1. Run `npm i lottie-react`.
2. Save your JSON as `public/brand/splash.json`.
3. Uncomment the example in `custom-splash.tsx`.
4. Set `type: "custom"` in `src/config/brand.ts`.

The **Android native splash** (shown while the WebView starts) is a static image generated from
`assets/splash.png` and `assets/splash-dark.png`. Replace those files, or re-run
`npm run icons`, then run `npm run android:assets`. After the native splash, the in-app animated
splash plays.

## Other brand settings

- **App name and tagline:** set `brand.appName` and `brand.tagline` in `src/config/brand.ts`.
- **Android label:** set `appName` in `capacitor.config.ts`.
- **Primary colour:** set `--primary` in `src/app/globals.css`. It is HSL, defined separately
  for light and dark. Also set `brand.themeColor`.
- **Chart colours:** set `--series-1…8` in `globals.css`. The default order is validated as
  colour-blind safe. If you change the hues, keep them distinguishable from each other.
