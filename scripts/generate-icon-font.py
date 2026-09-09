#!/usr/bin/env python3
"""Baut die Icon-Schrift auf die tatsächlich benutzten Symbole zusammen.

Hintergrund: Die vollständige „Material Symbols Rounded" ist als variable
Schrift 5,1 MB groß — sie enthält über 4000 Symbole, die App benutzt gut 200.
Vorher wurde sie bei jedem Kaltstart komplett von fonts.gstatic.com geladen.
Google liefert über den Parameter `icon_names` einen Zuschnitt; der landet
hier lokal in public/fonts/ und wird in globals.css eingebunden.

Aufruf (nötig, wenn ein NEUES Symbol im Code auftaucht):

    python3 scripts/generate-icon-font.py

Fehlt ein Symbol im Zuschnitt, zeigt die App an seiner Stelle den Namen als
Wort an („home"). Das fällt auf — es geht also nichts still verloren.

Braucht keine npm-Abhängigkeit, nur Internet.
"""

import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONT_OUT = ROOT / "public" / "fonts" / "material-symbols-rounded.woff2"
LIST_OUT = Path(__file__).resolve().parent / "icon-subset.txt"

CODEPOINTS = (
    "https://raw.githubusercontent.com/google/material-design-icons/master/"
    "variablefont/MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints"
)
AXES = "opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"

# Safari verlangt einen echten Browser-UA, sonst liefert Google TTF statt WOFF2.
UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
)


def fetch(url: str, accept_css: bool = False) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req) as r:
        return r.read()


def used_icon_names() -> list[str]:
    """Alle im Quelltext vorkommenden gültigen Symbolnamen.

    Erfasst wird bewusst breit: jeder String in Anführungszeichen und jeder
    JSX-Textinhalt, der auf der offiziellen Namensliste steht. Damit sind auch
    die Namen abgedeckt, die nicht direkt im <span> stehen, sondern über eine
    Variable hineinkommen (z. B. lib/eventCategories.ts, lib/dutyIcon.ts).
    Ein paar Fehltreffer sind einkalkuliert — ein Symbol zu viel kostet
    wenige Kilobyte, ein fehlendes wäre ein sichtbarer Fehler.
    """
    valid = {line.split()[0] for line in fetch(CODEPOINTS).decode().splitlines() if line.strip()}

    names: set[str] = set()
    quoted = re.compile(r"""['"`]([a-z0-9_]+)['"`]""")
    jsx_text = re.compile(r">\s*([a-z0-9_]+)\s*<")

    for path in ROOT.rglob("*.ts*"):
        if "node_modules" in path.parts or ".next" in path.parts:
            continue
        source = path.read_text(encoding="utf-8")
        for match in (*quoted.finditer(source), *jsx_text.finditer(source)):
            if match.group(1) in valid:
                names.add(match.group(1))

    return sorted(names)


def main() -> None:
    names = used_icon_names()
    if not names:
        sys.exit("Keine Symbolnamen gefunden — Abbruch, sonst entstünde eine leere Schrift.")

    query = urllib.parse.urlencode({
        "family": f"Material Symbols Rounded:{AXES}",
        "icon_names": ",".join(names),
    })
    css = fetch(f"https://fonts.googleapis.com/css2?{query}").decode()

    url = re.search(r"url\((https://[^)]+)\)", css)
    if not url:
        sys.exit("In der Antwort von Google stand keine Schrift-URL.")

    font = fetch(url.group(1))
    FONT_OUT.parent.mkdir(parents=True, exist_ok=True)
    FONT_OUT.write_bytes(font)
    LIST_OUT.write_text("\n".join(names) + "\n", encoding="utf-8")

    print(f"{len(names)} Symbole, {len(font) / 1024:.0f} KB → {FONT_OUT.relative_to(ROOT)}")
    print(f"Namensliste (für den Diff) → {LIST_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
