import json
import urllib.request
from collections import Counter
from datetime import datetime, timezone


def get(path):
    return json.load(urllib.request.urlopen("http://alhendalcompany-001-site7.stempurl.com/api" + path))


now = datetime.now(timezone.utc)
rooms = get("/AuctionRooms")
if isinstance(rooms, dict):
    rooms = rooms.get("data", [])
products = get("/Products")
cats = get("/Categories")

active = []
for a in rooms:
    if a.get("countryId") != 3:
        continue
    end = a.get("endTime")
    try:
        et = datetime.fromisoformat(end.replace("Z", "+00:00"))
    except Exception:
        et = None
    current = a.get("currentHighestBid") or a.get("startPoints") or 0
    target = a.get("limited") or 0
    alive = bool(et and now < et and (target == 0 or current < target))
    if alive or a.get("status") == 1:
        prod = a.get("product") or {}
        active.append(
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "status": a.get("status"),
                "end": end,
                "alive": alive,
                "categoryId": prod.get("categoryId"),
                "categoryName": prod.get("categoryName"),
                "productId": prod.get("id"),
                "startPoints": a.get("startPoints"),
                "limited": a.get("limited"),
            }
        )

cc = Counter()
for p in products:
    cc[f"{p.get('categoryId')}:{p.get('categoryName')}"] += 1

out = {
    "now": now.isoformat(),
    "categories": [{"id": c.get("id"), "name": c.get("name")} for c in cats],
    "products_by_cat": dict(cc),
    "egypt_rooms": sum(1 for a in rooms if a.get("countryId") == 3),
    "active_egypt": active,
    "products": [
        {
            "id": p.get("id"),
            "name": p.get("name"),
            "categoryId": p.get("categoryId"),
            "categoryName": p.get("categoryName"),
            "price": p.get("price"),
        }
        for p in products
    ],
}
from pathlib import Path

Path(__file__).with_name("inspect_current_egypt.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
)
print("wrote inspect_current_egypt.json active=", len(active), "products=", len(products))
