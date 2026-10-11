"""Replace broken product photos with the high-quality images the user sent."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

import requests

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
TIMEOUT = 90
SKU_RE = re.compile(r"SKU:\s*([A-Z0-9-]+)", re.I)
ASSETS = Path(r"C:\Users\pc\.cursor\projects\f-rabihani\assets")

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


def update_with_image(http: requests.Session, product: dict, image_path: Path) -> tuple[bool, str]:
    mime = "image/jpeg" if image_path.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
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
    return r.status_code in (200, 204), f"{r.status_code} {r.text[:200]}"


def main() -> None:
    http = requests.Session()
    products = {sku_of(p): p for p in http.get(f"{BASE}/Products", timeout=TIMEOUT).json()}
    results = []

    for sku, token in REPLACEMENTS.items():
        path = resolve_file(token)
        product = products.get(sku)
        row = {"sku": sku, "token": token, "exists": bool(path), "bytes": path.stat().st_size if path else 0}
        if not path:
            row["error"] = "file missing"
            results.append(row)
            print(f"MISSING FILE {sku} {token}", flush=True)
            continue
        if not product:
            row["error"] = "product not found"
            results.append(row)
            print(f"NO PRODUCT {sku}", flush=True)
            continue
        ok, msg = update_with_image(http, product, path)
        row.update({"id": product["id"], "name": product["name"], "ok": ok, "msg": msg})
        results.append(row)
        print(f"{'OK' if ok else 'FAIL'} {sku} {product['name']} {path.name[-40:]} {path.stat().st_size} {msg}", flush=True)
        time.sleep(0.3)

    out = Path(__file__).with_name("replace_broken_product_photos_result.json")
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
