"""
Replace API product data with the Excel electronics catalog.
Strategy: update existing products in-place (auctions block deletes), then add the rest.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import openpyxl
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
EXCEL = Path(r"c:\Users\Mahmoud ElSobky\Downloads\electronics_products_catalog_50 (3).xlsx")
TIMEOUT = 60

CATEGORY_MAP = {
    "Mobile Phones": 2,
    "Earbuds": 1,
    "Headphones": 1,
    "Speakers": 1,
    "Kettles": 4,
    "Blenders": 4,
    "Microwaves": 4,
    "Fans": 4,
    "Air Fryers": 4,
    "Small Appliances": 4,
    "Coffee Makers": 4,
}

TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


def log(msg: str) -> None:
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"), flush=True)


def session() -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=5,
        connect=5,
        read=5,
        backoff_factor=1.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "POST", "PUT", "DELETE"]),
    )
    adapter = HTTPAdapter(max_retries=retry)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s


def load_catalog() -> list[dict]:
    wb = openpyxl.load_workbook(EXCEL)
    ws = wb["Products"]
    rows = list(ws.iter_rows(values_only=True))
    headers = rows[0]
    products = []
    for row in rows[1:]:
        if not row or not row[0]:
            continue
        item = dict(zip(headers, row))
        products.append(
            {
                "sku": item["SKU"],
                "name": item["Product Name"],
                "brand": item["Brand"],
                "category": item["Category"],
                "price": item["Price (EGP)"],
                "stock": item["Stock"],
                "description": item["Description"],
            }
        )
    return products


def category_id(name: str) -> int:
    return CATEGORY_MAP[name]


def form_fields(p: dict, country_code: str = "EG", pid: int | None = None) -> dict:
    data = {
        "Name": p["name"],
        "Price": str(p["price"]),
        "Quantity": str(p["stock"] or 1),
        "CategoryId": str(category_id(p["category"])),
        "Description": f"{p['description']} | Brand: {p['brand']} | SKU: {p['sku']}",
        "CountryCode": country_code,
    }
    if pid is not None:
        data["Id"] = str(pid)
    return data


def get_products(http: requests.Session) -> list[dict]:
    r = http.get(f"{BASE}/Products", timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def delete_product(http: requests.Session, pid: int) -> tuple[bool, str]:
    try:
        r = http.delete(f"{BASE}/Products/{pid}", timeout=TIMEOUT)
        return r.status_code in (200, 204), f"{r.status_code} {r.text[:200]}"
    except requests.RequestException as e:
        return False, f"ERR {e}"


def add_product(http: requests.Session, p: dict) -> tuple[bool, str]:
    data = form_fields(p)
    try:
        r = http.post(f"{BASE}/Products", data=data, timeout=TIMEOUT)
        if r.status_code in (200, 201):
            return True, "OK"
        files = {"Image": ("placeholder.png", TINY_PNG, "image/png")}
        r2 = http.post(f"{BASE}/Products", data=data, files=files, timeout=TIMEOUT)
        return r2.status_code in (200, 201), f"{r2.status_code} {r2.text[:300]}"
    except requests.RequestException as e:
        return False, f"ERR {e}"


def update_product(http: requests.Session, pid: int, p: dict) -> tuple[bool, str]:
    data = form_fields(p, pid=pid)
    try:
        r = http.put(f"{BASE}/Products/{pid}", data=data, timeout=TIMEOUT)
        if r.status_code in (200, 204):
            return True, "OK"
        files = {"Image": ("placeholder.png", TINY_PNG, "image/png")}
        r2 = http.put(f"{BASE}/Products/{pid}", data=data, files=files, timeout=TIMEOUT)
        return r2.status_code in (200, 204), f"{r2.status_code} {r2.text[:300]}"
    except requests.RequestException as e:
        return False, f"ERR {e}"


def main() -> int:
    http = session()
    catalog = load_catalog()
    log(f"Loaded {len(catalog)} products from Excel")

    existing = get_products(http)
    existing = sorted(existing, key=lambda x: x["id"])
    log(f"API currently has {len(existing)} products")

    # Try delete products not needed; keep failures for in-place update
    kept: list[dict] = []
    for prod in existing:
        ok, msg = delete_product(http, prod["id"])
        if ok:
            log(f"DELETE {prod['id']} OK")
        else:
            log(f"KEEP {prod['id']} ({msg})")
            kept.append(prod)
        time.sleep(0.15)

    idx = 0
    updated = 0
    for old in kept:
        if idx >= len(catalog):
            break
        p = catalog[idx]
        ok, msg = update_product(http, old["id"], p)
        log(f"UPDATE {old['id']} -> {p['name']}: {msg if not ok else 'OK'}")
        if ok:
            updated += 1
        idx += 1
        time.sleep(0.25)

    added = 0
    failed_adds = []
    while idx < len(catalog):
        p = catalog[idx]
        ok, msg = add_product(http, p)
        log(f"ADD {p['name']}: {msg if not ok else 'OK'}")
        if ok:
            added += 1
        else:
            failed_adds.append({"name": p["name"], "error": msg})
        idx += 1
        time.sleep(0.35)

    final = get_products(http)
    summary = {
        "excel_count": len(catalog),
        "final_api_count": len(final),
        "updated": updated,
        "added": added,
        "failed_adds": failed_adds,
        "product_names": [p["name"] for p in final],
    }
    out = Path(__file__).with_name("seed_products_result.json")
    out.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"Wrote {out}")
    log(json.dumps(summary, ensure_ascii=True, indent=2))
    return 0 if not failed_adds and len(final) >= len(catalog) else 1


if __name__ == "__main__":
    sys.exit(main())
