"""Re-add missing products and fix remaining blank images."""
from __future__ import annotations

import json
import time
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
IMG_DIR = Path(__file__).with_name("product_images")
TIMEOUT = 60
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

MISSING_TO_ADD = [
    {
        "name": "Samsung Galaxy A16 128GB",
        "price": 10500,
        "quantity": 15,
        "categoryId": 2,
        "description": "Samsung Galaxy A16 128GB - Mobile Phones | Brand: Samsung | SKU: MOB-SAM-A16-128",
        "image": "Samsung_Galaxy_A16_128GB.jpg",
    },
    {
        "name": "Samsung Galaxy A36 5G 128GB",
        "price": 19000,
        "quantity": 10,
        "categoryId": 2,
        "description": "Samsung Galaxy A36 5G 128GB - Mobile Phones | Brand: Samsung | SKU: MOB-SAM-A36-128",
        "image": "Samsung_Galaxy_A36_5G_128GB.jpg",
    },
    {
        "name": "Xiaomi Redmi Note 14 256GB",
        "price": 12000,
        "quantity": 20,
        "categoryId": 2,
        "description": "Xiaomi Redmi Note 14 256GB - Mobile Phones | Brand: Xiaomi | SKU: MOB-XIA-RN14-256",
        "image": "Xiaomi_Redmi_Note_14_256GB.jpg",
        "image_urls": [
            "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-note-14/PC/0ef9b459a30f269cb5310d95f29d4516.jpg",
            "https://media.ldlc.com/r1600/ld/products/00/06/20/00/LD0006200091.jpg",
        ],
    },
    {
        "name": "OPPO Reno 13F 256GB",
        "price": 18500,
        "quantity": 10,
        "categoryId": 2,
        "description": "OPPO Reno 13F 256GB - Mobile Phones | Brand: OPPO | SKU: MOB-OPP-R13F-256",
        "image": "OPPO_Reno_13F_256GB.jpg",
    },
    {
        "name": "realme Note 60 128GB",
        "price": 6000,
        "quantity": 20,
        "categoryId": 2,
        "description": "realme Note 60 128GB - Mobile Phones | Brand: realme | SKU: MOB-REA-N60-128",
        "image": "realme_Note_60_128GB.jpg",
    },
]

FIX_IMAGES = [
    {
        "name": "Honor X8c 256GB",
        "image": "Honor_X8c_256GB.jpg",
        "image_urls": [
            "https://businessmirror.com.ph/wp-content/uploads/2025/03/x8c.jpg",
            "https://dakauf.eu/wp-content/uploads/2025/08/Honour-x8c-3-1.png",
        ],
    },
    {
        "name": "Philips Air Fryer 6.2L",
        "image": "Philips_Air_Fryer_6_2L.jpg",
        "image_urls": [
            "https://images.philips.com/is/image/philipsconsumer/vrs_5c00fac29783b152e36e403bee19d24235cef0e1?$pnglarge$&wid=1250",
            "https://img.kavosdraugas.lt/a8322474-3b99-4043-a3f8-f65beaa18ee7/1000x1000/na332-00-1png.jpg",
        ],
    },
]


def log(msg: str) -> None:
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"), flush=True)


def session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": UA})
    retry = Retry(total=4, connect=4, read=4, backoff_factor=1.2, status_forcelist=(429, 500, 502, 503, 504))
    adapter = HTTPAdapter(max_retries=retry)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s


def download_as_jpeg(http: requests.Session, url: str, dest: Path) -> bool:
    try:
        r = http.get(url, timeout=TIMEOUT)
        if r.status_code != 200 or len(r.content) < 5000:
            return False
        img = Image.open(BytesIO(r.content)).convert("RGB")
        if min(img.size) < 150:
            return False
        img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        img.save(dest, format="JPEG", quality=88, optimize=True)
        return dest.stat().st_size > 5000
    except Exception as e:
        log(f"  download fail: {e}")
        return False


def ensure_image(http: requests.Session, filename: str, urls: list[str] | None = None) -> Path | None:
    dest = IMG_DIR / filename
    if dest.exists() and dest.stat().st_size > 5000:
        return dest
    for url in urls or []:
        log(f"  fetch {url[:90]}")
        if download_as_jpeg(http, url, dest):
            log(f"  saved {dest.name}")
            return dest
    return None


def add_product(http: requests.Session, item: dict, image: Path) -> tuple[bool, str]:
    data = {
        "Name": item["name"],
        "Price": str(item["price"]),
        "Quantity": str(item["quantity"]),
        "CategoryId": str(item["categoryId"]),
        "Description": item["description"],
        "CountryCode": "EG",
    }
    with image.open("rb") as f:
        files = {"Image": (image.name, f, "image/jpeg")}
        r = http.post(f"{BASE}/Products", data=data, files=files, timeout=TIMEOUT)
    return r.status_code in (200, 201), f"{r.status_code} {r.text[:250]}"


def update_image(http: requests.Session, product: dict, image: Path) -> tuple[bool, str]:
    data = {
        "Id": str(product["id"]),
        "Name": product["name"],
        "Price": str(product["price"]),
        "Quantity": str(product.get("quantity") or 1),
        "CategoryId": str(product["categoryId"]),
        "Description": product.get("description") or "",
        "CountryCode": "EG",
    }
    with image.open("rb") as f:
        files = {"Image": (image.name, f, "image/jpeg")}
        r = http.put(f"{BASE}/Products/{product['id']}", data=data, files=files, timeout=TIMEOUT)
    return r.status_code in (200, 204), f"{r.status_code} {r.text[:250]}"


def main() -> int:
    http = session()
    products = http.get(f"{BASE}/Products", timeout=TIMEOUT).json()
    by_name = {p["name"]: p for p in products}
    log(f"Current products: {len(products)}")

    # Fix images on existing products
    for item in FIX_IMAGES:
        img = ensure_image(http, item["image"], item.get("image_urls"))
        prod = by_name.get(item["name"])
        if not prod:
            log(f"MISSING product for image fix: {item['name']}")
            continue
        if not img:
            log(f"NO IMAGE for {item['name']}")
            continue
        ok, msg = update_image(http, prod, img)
        log(f"FIX {item['name']}: {'OK' if ok else msg}")
        time.sleep(0.5)

    # Re-add missing products
    for item in MISSING_TO_ADD:
        if item["name"] in by_name:
            log(f"SKIP exists: {item['name']}")
            continue
        img = ensure_image(http, item["image"], item.get("image_urls"))
        if not img:
            log(f"NO IMAGE cannot add: {item['name']}")
            continue
        ok, msg = add_product(http, item, img)
        log(f"ADD {item['name']}: {'OK' if ok else msg}")
        time.sleep(0.6)

    final = http.get(f"{BASE}/Products", timeout=TIMEOUT).json()
    tiny = []
    for p in final:
        url = p.get("imageUrl") or ""
        if not url:
            tiny.append(p["name"])
            continue
        try:
            size = len(http.get(url, timeout=TIMEOUT).content)
            if size < 5000:
                tiny.append(f"{p['name']} ({size}b)")
        except Exception as e:
            tiny.append(f"{p['name']} (err {e})")

    summary = {"final_count": len(final), "tiny_or_missing": tiny, "names": [p["name"] for p in final]}
    Path(__file__).with_name("fix_images_result.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log(json.dumps(summary, ensure_ascii=True, indent=2))
    return 0 if len(final) >= 50 and not tiny else 1


if __name__ == "__main__":
    raise SystemExit(main())
