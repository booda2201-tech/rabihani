"""Strip baked-in black backgrounds and re-upload real transparent PNGs."""
from __future__ import annotations

import json
import re
import time
from collections import deque
from pathlib import Path

import numpy as np
import requests
from PIL import Image, ImageFilter

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
TIMEOUT = 90
SKU_RE = re.compile(r"SKU:\s*([A-Z0-9-]+)", re.I)
ASSETS = Path(r"C:\Users\pc\.cursor\projects\f-rabihani\assets")
OUT = Path(__file__).with_name("transparent_uploads")
OUT.mkdir(exist_ok=True)

REPLACEMENTS = {
    "APP-BRA-HBLEND": "f0fa9f03-7496-423a-823b-5b11e1b2479d",
    "AUD-ANK-LIB5": "670eb6a2-864f-4fa0-99bb-add904b4bf80",
    "AUD-PHI-TAT3559": "4324eaf1-7b72-4885-8661-1a4b99fb09db",
    "AUD-ANK-R50NC": "dea485b0-9a16-4b82-b7f5-cbbbcb8dc007",
    "APP-TOR-MW20": "107f4cee-243b-4ec2-8bb8-28a56187f28f",
    "AUD-SON-CH520": "65846289-904c-421d-90de-82667e77fe6d",
    "AUD-XIA-B6P": "e92fa300-d558-4f41-b8fa-255968de57a7",
    "AUD-APP-AP4": "dd176d0a-61f1-41b7-9ab4-7dcab3aadf87",
    "APP-FRE-BFAN": "30bf6ea5-f12c-438b-bd62-6d4444d15b58",
}


def resolve_file(token: str) -> Path | None:
    matches = list(ASSETS.glob(f"*{token}.*"))
    return matches[0] if matches else None


def sku_of(product: dict) -> str:
    m = SKU_RE.search(product.get("description") or "")
    return m.group(1).upper() if m else ""


def remove_black_background(src: Path, dest: Path, threshold: int = 12) -> dict:
    rgb = np.array(Image.open(src).convert("RGB"))
    lum = rgb.max(axis=2)
    h, w = lum.shape
    bg = np.zeros((h, w), dtype=bool)
    seen = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def try_push(y: int, x: int) -> None:
        if not seen[y, x] and lum[y, x] <= threshold:
            seen[y, x] = True
            q.append((y, x))

    for x in range(w):
        try_push(0, x)
        try_push(h - 1, x)
    for y in range(h):
        try_push(y, 0)
        try_push(y, w - 1)

    while q:
        y, x = q.popleft()
        bg[y, x] = True
        if y > 0:
            try_push(y - 1, x)
        if y + 1 < h:
            try_push(y + 1, x)
        if x > 0:
            try_push(y, x - 1)
        if x + 1 < w:
            try_push(y, x + 1)

    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(1.2))
    rgba = np.dstack([rgb, np.array(alpha_img)])
    Image.fromarray(rgba, "RGBA").save(dest, format="PNG", optimize=True)
    return {
        "transparent_pct": round(float(bg.mean()) * 100, 2),
        "bytes": dest.stat().st_size,
        "mode": "RGBA",
    }


def update_with_png(http: requests.Session, product: dict, image_path: Path) -> tuple[bool, str]:
    data = {
        "Id": str(product["id"]),
        "Name": product["name"],
        "Price": str(product["price"]),
        "Quantity": str(product.get("quantity") or 1),
        "CategoryId": str(product["categoryId"]),
        "Description": product.get("description") or "",
        "CountryCode": "EG",
    }
    with image_path.open("rb") as f:
        files = {"Image": (f"{image_path.stem}.png", f, "image/png")}
        r = http.put(f"{BASE}/Products/{product['id']}", data=data, files=files, timeout=TIMEOUT)
    return r.status_code in (200, 204), f"{r.status_code} {r.text[:220]}"


def main() -> None:
    http = requests.Session()
    products = {sku_of(p): p for p in http.get(f"{BASE}/Products", timeout=TIMEOUT).json()}
    results = []

    for sku, token in REPLACEMENTS.items():
        src = resolve_file(token)
        product = products.get(sku)
        dest = OUT / f"{sku}.png"
        row = {"sku": sku}
        if not src or not product:
            row["error"] = "missing file or product"
            results.append(row)
            print(f"SKIP {sku}", flush=True)
            continue
        info = remove_black_background(src, dest)
        ok, msg = update_with_png(http, product, dest)
        png_url = ".png" in msg.lower()
        row.update({"id": product["id"], "name": product["name"], "ok": ok, "png_url": png_url, **info, "msg": msg})
        results.append(row)
        print(f"{'OK' if ok else 'FAIL'} {sku} transparent={info['transparent_pct']}% png_url={png_url} {msg[:120]}", flush=True)
        time.sleep(0.3)

    Path(__file__).with_name("reupload_transparent_result.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
