// Generiert Apple Wallet Pass-Assets aus public/logo_breit.png + logo_quadratisch.png
// Verwendung: node scripts/gen-pass-assets.mjs
import sharp from "sharp";

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// Breites Logo (Wappen + "GS ULM NEU-ULM") → Apple Logo Slot
// Apple max: 160×50 (1x) / 320×100 (2x). Mit "contain" + transparenter Hintergrund.
async function buildLogo(width, height, out) {
  await sharp("public/logo_breit.png")
    .resize(width, height, { fit: "contain", background: TRANSPARENT })
    .png()
    .toFile(out);
  console.log("wrote", out);
}

// Favicon (nur Wappen, kein Text) → Icon (Notifications/Lock Screen)
// Weißer Hintergrund damit das Wappen auf dem roten Pass-Hintergrund sichtbar bleibt
async function buildIcon(size, out) {
  await sharp("public/favicon.png")
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(out);
  console.log("wrote", out);
}

await buildLogo(160, 50, "pass-model/logo.png");
await buildLogo(320, 100, "pass-model/logo@2x.png");
await buildIcon(29, "pass-model/icon.png");
await buildIcon(58, "pass-model/icon@2x.png");
