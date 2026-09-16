from io import BytesIO
from pathlib import Path
import time

import requests
from ddgs import DDGS
from PIL import Image

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
http = requests.Session()
http.headers["User-Agent"] = "Mozilla/5.0"
dest = Path(__file__).with_name("product_images") / "Honor_X8c_256GB.jpg"

urls = []
for q in ["Honor X8c black smartphone product shot", "HONOR X8c 256GB phone"]:
    try:
        with DDGS() as d:
            urls += [x.get("image") for x in d.images(q, max_results=8) if x.get("image")]
    except Exception as e:
        print("search err", e)
    time.sleep(1)

print("candidates", len(urls))
ok = False
for u in urls:
    try:
        r = http.get(u, timeout=40)
        if r.status_code != 200 or len(r.content) < 8000:
            continue
        img = Image.open(BytesIO(r.content)).convert("RGB")
        if min(img.size) < 200:
            continue
        img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        img.save(dest, format="JPEG", quality=88, optimize=True)
        print("saved", dest.stat().st_size, u[:120])
        ok = True
        break
    except Exception as e:
        print("fail", e)

if not ok:
    raise SystemExit("no image")

prods = http.get(f"{BASE}/Products", timeout=60).json()
p = next(x for x in prods if x["name"] == "Honor X8c 256GB")
data = {
    "Id": str(p["id"]),
    "Name": p["name"],
    "Price": str(p["price"]),
    "Quantity": str(p.get("quantity") or 1),
    "CategoryId": str(p["categoryId"]),
    "Description": p.get("description") or "",
    "CountryCode": "EG",
}
with dest.open("rb") as f:
    r = http.put(
        f"{BASE}/Products/{p['id']}",
        data=data,
        files={"Image": (dest.name, f, "image/jpeg")},
        timeout=60,
    )
print("upload", r.status_code, r.text[:200])

prods = http.get(f"{BASE}/Products", timeout=60).json()
p = next(x for x in prods if x["name"] == "Honor X8c 256GB")
sz = len(http.get(p["imageUrl"], timeout=60).content)
print("final image size", sz, "count", len(prods))
