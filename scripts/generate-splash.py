#!/usr/bin/env python3
"""Erzeugt die iOS-Startbilder der PWA und die dazu passende Geräteliste.

Warum es die überhaupt braucht: Ein Web-App-Symbol auf dem iOS-Homescreen
zeigt beim Start ein `apple-touch-startup-image`, wenn eine der Media-Queries
exakt auf das Gerät passt. Passt keine, zeigt iOS eine leere Fläche — je nach
Erscheinungsbild weiß oder schwarz. `background_color` aus dem Manifest greift
dort nicht.

Aufruf (einmalig, wenn neue Gerätegrößen dazukommen):

    python3 scripts/generate-splash.py

Schreibt `public/splash/*.png` und generiert `lib/splashScreens.ts` neu.
Braucht Pillow (`pip install pillow`) — reines Asset-Werkzeug, deshalb keine
npm-Abhängigkeit.
"""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "splash"
ICON = ROOT / "public" / "icon-512.png"

# Hintergrund = `background_color` aus app/manifest.ts = body-Hintergrund aus
# globals.css. Damit ist der Übergang Splash → erste Seite farblich nahtlos.
BG = (239, 234, 224, 255)

# Nur Hochformat: die App ist im Manifest auf `portrait` festgelegt.
# (CSS-Breite, CSS-Höhe, Pixelverhältnis, Geräte)
DEVICES = [
    (320,  568, 2, "iPhone SE (1. Gen), 5s"),
    (375,  667, 2, "iPhone SE (2./3. Gen), 6/7/8"),
    (414,  736, 3, "iPhone 6+/7+/8+"),
    (375,  812, 3, "iPhone X/XS, 11 Pro, 12/13 mini"),
    (414,  896, 2, "iPhone XR, 11"),
    (414,  896, 3, "iPhone XS Max, 11 Pro Max"),
    (390,  844, 3, "iPhone 12/12 Pro, 13/13 Pro, 14"),
    (428,  926, 3, "iPhone 12/13/14 Pro Max"),
    (393,  852, 3, "iPhone 14 Pro, 15/15 Pro, 16"),
    (430,  932, 3, "iPhone 14 Pro Max, 15 Plus/Pro Max, 16 Plus"),
    (402,  874, 3, "iPhone 16 Pro"),
    (440,  956, 3, "iPhone 16 Pro Max"),
    (768, 1024, 2, "iPad 9,7\" / mini"),
    (810, 1080, 2, "iPad 10,2\""),
    (820, 1180, 2, "iPad Air 10,9\""),
    (834, 1112, 2, "iPad Pro 10,5\""),
    (834, 1194, 2, "iPad Pro 11\""),
    (1024, 1366, 2, "iPad Pro 12,9\""),
]


def rounded(img: Image.Image, radius: int) -> Image.Image:
    """Beschneidet das Symbol auf iOS-typisch gerundete Ecken."""
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius, fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    icon = Image.open(ICON).convert("RGBA")

    for css_w, css_h, dpr, _label in DEVICES:
        w, h = css_w * dpr, css_h * dpr
        canvas = Image.new("RGBA", (w, h), BG)

        # Symbol auf ~22 % der kürzeren Kante, optisch leicht über der Mitte —
        # so sitzt es dort, wo das Auge die Bildmitte vermutet.
        size = max(96, int(min(w, h) * 0.22))
        mark = rounded(icon.resize((size, size), Image.LANCZOS), int(size * 0.225))
        canvas.alpha_composite(mark, ((w - size) // 2, int(h * 0.5) - size // 2 - int(h * 0.04)))

        canvas.convert("RGB").save(OUT / f"{w}x{h}.png", optimize=True)

    entries = "\n".join(
        f"  {{ w: {cw * d}, h: {ch * d}, deviceWidth: {cw}, deviceHeight: {ch}, ratio: {d} }}, // {label}"
        for cw, ch, d, label in DEVICES
    )
    (ROOT / "lib" / "splashScreens.ts").write_text(
        "// GENERIERT von scripts/generate-splash.py — nicht von Hand ändern.\n"
        "// Die Liste beschreibt die iOS-Startbilder in public/splash/.\n"
        "// Kommt ein Gerät dazu: in DEVICES im Skript ergänzen und es erneut laufen lassen.\n\n"
        "export type SplashScreen = {\n"
        "  /** Pixelbreite der Bilddatei. */\n  w: number\n"
        "  /** Pixelhöhe der Bilddatei. */\n  h: number\n"
        "  deviceWidth: number\n  deviceHeight: number\n  ratio: number\n"
        "}\n\n"
        f"export const SPLASH_SCREENS: SplashScreen[] = [\n{entries}\n]\n",
        encoding="utf-8",
    )
    print(f"{len(DEVICES)} Startbilder in {OUT.relative_to(ROOT)} und lib/splashScreens.ts geschrieben.")


if __name__ == "__main__":
    main()
