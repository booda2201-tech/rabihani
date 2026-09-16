import json
from datetime import datetime, timezone

with open("countries.json", encoding="utf-8") as f:
    countries = json.load(f)
print("=== COUNTRIES ===")
for c in countries:
    print(c)

with open("auctions.json", encoding="utf-8") as f:
    auctions = json.load(f)
if isinstance(auctions, dict):
    auctions = auctions.get("data", auctions)
print("\n=== AUCTIONS count:", len(auctions))
now = datetime.now(timezone.utc)
active = []
for a in auctions:
    start = a.get("startTime")
    end = a.get("endTime")
    status = a.get("status")
    print(
        f"id={a.get('id')} name={a.get('roomName') or a.get('name')} "
        f"status={status} countryId={a.get('countryId')} "
        f"productId={a.get('productId')} start={start} end={end} "
        f"limited={a.get('limited')} current={a.get('currentHighestBid')}"
    )
    try:
        st = datetime.fromisoformat(start.replace("Z", "+00:00")) if start else None
        et = datetime.fromisoformat(end.replace("Z", "+00:00")) if end else None
    except Exception:
        st = et = None
    current = a.get("currentHighestBid") or a.get("startPoints") or 0
    target = a.get("limited") or 0
    is_started = st and now >= st
    is_not_ended = et and now < et
    target_ok = target == 0 or current < target
    if (status == 1 or (status == 0 and is_started)) and is_not_ended and target_ok:
        active.append(a)

print("\n=== ACTIVE count:", len(active))
for a in active:
    print(
        f" ACTIVE id={a.get('id')} productId={a.get('productId')} "
        f"country={a.get('countryId')} name={a.get('roomName')}"
    )

with open("products.json", encoding="utf-8") as f:
    products = json.load(f)
print("\n=== PRODUCTS count:", len(products))
for p in products[:20]:
    print(
        f" id={p.get('id')} name={p.get('name')} price={p.get('price')} "
        f"country={p.get('countryCode') or p.get('countryId')}"
    )
