import json
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
OUT = "scripts/inspect_current_data.json"


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


countries = get("/Countries")
cats = get("/Categories")
products = get("/Products")
auctions = get("/AuctionRooms")
if isinstance(auctions, dict):
    auctions = auctions.get("data", [])

by_cat = defaultdict(list)
for p in products:
    cid = p.get("categoryId") or (p.get("category") or {}).get("id")
    cname = p.get("categoryName") or (p.get("category") or {}).get("name")
    by_cat[str((cid, cname))].append(
        {"id": p.get("id"), "name": p.get("name"), "price": p.get("price")}
    )

now = datetime.now(timezone.utc)
egypt = [a for a in auctions if a.get("countryId") == 3]

summary = {
    "now": now.isoformat(),
    "countries": countries,
    "categories": cats,
    "product_count": len(products),
    "product_keys": list(products[0].keys()) if products else [],
    "sample_product": products[0] if products else None,
    "products_by_category": {k: v for k, v in by_cat.items()},
    "auction_count": len(auctions),
    "egypt_auctions": [
        {
            "id": a.get("id"),
            "name": a.get("name"),
            "status": a.get("status"),
            "start": a.get("startTime"),
            "end": a.get("endTime"),
            "productId": (a.get("product") or {}).get("id"),
            "categoryId": (a.get("product") or {}).get("categoryId"),
        }
        for a in egypt
    ],
    "all_auctions_brief": [
        {
            "id": a.get("id"),
            "countryId": a.get("countryId"),
            "status": a.get("status"),
            "name": a.get("name"),
            "start": a.get("startTime"),
            "end": a.get("endTime"),
        }
        for a in auctions
    ],
}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)

print(f"Wrote {OUT}")
print(f"products={len(products)} auctions={len(auctions)} egypt={len(egypt)} cats={len(cats)}")
