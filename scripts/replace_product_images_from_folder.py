"""Replace every product image with the matching file from f:\\rabihani-prudact."""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
IMG_DIR = Path(r"f:\rabihani-prudact")
TIMEOUT = 90
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
SKU_RE = re.compile(r"SKU:\s*([A-Z0-9-]+)", re.I)


def log(msg: str) -> None:
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"), flush=True)


def session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": UA})
    retry = Retry(
        total=4,
        connect=4,
        read=4,
        backoff_factor=1.2,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "POST", "PUT"]),
    )
    adapter = HTTPAdapter(max_retries=retry)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s


def index_images() -> dict[str, Path]:
    files = {}
    for p in IMG_DIR.iterdir():
        if p.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
            continue
        key = p.stem.upper()
        files[key] = p
    return files


def product_sku(product: dict) -> str:
    desc = product.get("description") or ""
    m = SKU_RE.search(desc)
    if m:
        return m.group(1).upper()
    name = (product.get("name") or "").upper()
    return re.sub(r"[^A-Z0-9-]+", "-", name).strip("-")


def update_with_image(http: requests.Session, product: dict, image_path: Path) -> tuple[bool, str]:
    mime = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"
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
        files = {"Image": (image_path.name, f, mime)}
        r = http.put(f"{BASE}/Products/{product['id']}", data=data, files=files, timeout=TIMEOUT)
    return r.status_code in (200, 204), f"{r.status_code} {r.text[:250]}"


def main() -> int:
    images = index_images()
    log(f"Folder images: {len(images)}")
    http = session()
    products = http.get(f"{BASE}/Products", timeout=TIMEOUT).json()
    log(f"Products: {len(products)}")

    ok_count = 0
    failed = []
    unmatched = []

    for i, p in enumerate(products, 1):
        sku = product_sku(p)
        img = images.get(sku)
        log(f"\n[{i}/{len(products)}] {p['name']} sku={sku} id={p['id']}")
        if not img:
            unmatched.append({"id": p["id"], "name": p["name"], "sku": sku})
            log("  no matching file")
            continue
        ok, msg = update_with_image(http, p, img)
        if ok:
            ok_count += 1
            log(f"  uploaded {img.name}")
        else:
            failed.append({"id": p["id"], "name": p["name"], "sku": sku, "error": msg})
            log(f"  FAIL: {msg}")
        time.sleep(0.35)

    unused = sorted(set(images) - {product_sku(p) for p in products})
    summary = {
        "uploaded_ok": ok_count,
        "unmatched_products": unmatched,
        "failed": failed,
        "unused_images": unused,
        "total_products": len(products),
        "total_images": len(images),
    }
    out = Path(__file__).with_name("replace_folder_images_result.json")
    out.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    log("\n=== SUMMARY ===")
    log(json.dumps(summary, ensure_ascii=True, indent=2))
    return 0 if not failed and not unmatched else 1


if __name__ == "__main__":
    sys.exit(main())
