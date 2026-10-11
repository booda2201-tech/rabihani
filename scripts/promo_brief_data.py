import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
now = datetime.now(timezone.utc)


def get(path):
    return json.loads(urlopen(BASE + path, timeout=40).read().decode("utf-8"))


rooms = get("/AuctionRooms")
if isinstance(rooms, dict):
    rooms = rooms.get("data", [])
products = get("/Products")
companies = get("/Companies")
ads = get("/Advertisements")
countries = get("/Countries")

active = []
for a in rooms:
    if a.get("countryId") != 3:
        continue
    try:
        et = datetime.fromisoformat((a.get("endTime") or "").replace("Z", "+00:00"))
    except Exception:
        continue
    current = a.get("currentHighestBid") or a.get("startPoints") or 0
    target = a.get("limited") or 0
    if a.get("status") in (0, 1) and now < et and (target == 0 or current < target):
        p = a.get("product") or {}
        active.append(
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "startPoints": a.get("startPoints"),
                "limited": a.get("limited"),
                "endTime": a.get("endTime"),
                "price": p.get("price"),
                "category": p.get("categoryName"),
                "imageUrl": p.get("imageUrl"),
            }
        )

out = {
    "active_egypt": active,
    "companies": [
        {
            "id": c.get("id"),
            "name": c.get("name"),
            "description": c.get("description"),
            "howToEarn": c.get("howToEarnPoints"),
            "tier": c.get("tier"),
            "countryId": c.get("countryId"),
        }
        for c in companies
    ],
    "ads_count": len(ads) if isinstance(ads, list) else 0,
    "countries": [{"id": c.get("id"), "name": c.get("name"), "currency": c.get("currency")} for c in countries],
    "product_count": len(products),
}
Path(__file__).with_name("promo_brief_data.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
)
print("ok", len(active), len(companies), len(products))
