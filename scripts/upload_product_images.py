"""
Download real product photos and upload them to the API for every product.
"""
from __future__ import annotations

import json
import re
import sys
import time
from io import BytesIO
from pathlib import Path

import requests
from ddgs import DDGS
from PIL import Image
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
OUT = Path(__file__).with_name("product_images")
OUT.mkdir(exist_ok=True)
TIMEOUT = 60
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


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


def get_products(http: requests.Session) -> list[dict]:
    r = http.get(f"{BASE}/Products", timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def search_image_urls(query: str, limit: int = 8) -> list[str]:
    urls: list[str] = []
    try:
        with DDGS() as ddg:
            results = list(ddg.images(query, max_results=limit))
        for item in results:
            url = item.get("image") or item.get("thumbnail")
            if url and url.startswith("http"):
                urls.append(url)
    except Exception as e:
        log(f"  search error: {e}")
    return urls


def download_as_jpeg(http: requests.Session, url: str, dest: Path) -> bool:
    try:
        r = http.get(url, timeout=TIMEOUT, stream=True)
        if r.status_code != 200:
            return False
        ctype = (r.headers.get("Content-Type") or "").lower()
        if "svg" in ctype or "html" in ctype:
            return False
        data = r.content
        if len(data) < 5_000:
            return False
        img = Image.open(BytesIO(data))
        img = img.convert("RGB")
        w, h = img.size
        if w < 200 or h < 200:
            return False
        # Keep reasonable upload size
        max_side = 1200
        if max(w, h) > max_side:
            img.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        img.save(dest, format="JPEG", quality=88, optimize=True)
        return dest.exists() and dest.stat().st_size > 5_000
    except Exception:
        return False


def find_local_image(http: requests.Session, product_name: str) -> Path | None:
    safe = re.sub(r"[^a-zA-Z0-9_-]+", "_", product_name)[:80]
    dest = OUT / f"{safe}.jpg"
    if dest.exists() and dest.stat().st_size > 5_000:
        return dest

    queries = [
        f"{product_name} product white background",
        f"{product_name} official product photo",
        f"{product_name}",
    ]
    for q in queries:
        log(f"  search: {q}")
        for url in search_image_urls(q):
            log(f"  try: {url[:90]}")
            if download_as_jpeg(http, url, dest):
                log(f"  saved {dest.name} ({dest.stat().st_size} bytes)")
                return dest
            time.sleep(0.4)
        time.sleep(1.0)
    return None


def update_with_image(http: requests.Session, product: dict, image_path: Path) -> tuple[bool, str]:
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
        files = {"Image": (image_path.name, f, "image/jpeg")}
        r = http.put(f"{BASE}/Products/{product['id']}", data=data, files=files, timeout=TIMEOUT)
    return r.status_code in (200, 204), f"{r.status_code} {r.text[:250]}"


def main() -> int:
    http = session()
    products = get_products(http)
    log(f"Products: {len(products)}")

    ok_count = 0
    failed = []

    for i, p in enumerate(products, 1):
        name = p["name"]
        log(f"\n[{i}/{len(products)}] {name} (id={p['id']})")
        img = find_local_image(http, name)
        if not img:
            failed.append({"id": p["id"], "name": name, "error": "no image found"})
            continue
        ok, msg = update_with_image(http, p, img)
        if ok:
            ok_count += 1
            log("  upload OK")
        else:
            failed.append({"id": p["id"], "name": name, "error": msg})
            log(f"  upload FAIL: {msg}")
        time.sleep(0.8)

    # Verify image sizes via head/get
    final = get_products(http)
    tiny = []
    for p in final:
        url = p.get("imageUrl") or ""
        if not url:
            tiny.append(p["name"])
            continue
        try:
            r = http.get(url, timeout=TIMEOUT)
            if len(r.content) < 5_000:
                tiny.append(p["name"])
        except Exception:
            tiny.append(p["name"])

    summary = {
        "uploaded_ok": ok_count,
        "failed": failed,
        "still_tiny_or_missing": tiny,
        "total": len(final),
    }
    out = Path(__file__).with_name("upload_images_result.json")
    out.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    log("\n=== SUMMARY ===")
    log(json.dumps(summary, ensure_ascii=True, indent=2))
    return 0 if ok_count == len(products) and not tiny else 1


if __name__ == "__main__":
    sys.exit(main())
