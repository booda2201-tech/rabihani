import json
from datetime import datetime, timezone

import requests

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"

rooms = requests.get(f"{BASE}/AuctionRooms", timeout=60).json()
if isinstance(rooms, dict):
    rooms = rooms.get("data", [])

active_api = requests.get(f"{BASE}/AuctionRooms/active", params={"countryId": 3}, timeout=60).json()
if isinstance(active_api, dict):
    active_api = active_api.get("data", [])

now = datetime.now(timezone.utc)
egypt = []
for a in rooms:
    if a.get("countryId") != 3:
        continue
    start = a.get("startTime")
    end = a.get("endTime")
    st = datetime.fromisoformat(start.replace("Z", "+00:00")) if start else None
    et = datetime.fromisoformat(end.replace("Z", "+00:00")) if end else None
    current = a.get("currentHighestBid") or a.get("startPoints") or 0
    target = a.get("limited") or 0
    is_started = st is not None and now >= st
    is_not_ended = et is not None and now < et
    target_ok = target == 0 or current < target
    status = a.get("status")
    active = (status == 1 or (status == 0 and is_started)) and is_not_ended and target_ok
    if active:
        egypt.append(
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "status": status,
                "category": (a.get("product") or {}).get("categoryName"),
                "start": start,
                "end": end,
            }
        )

out = {
    "now": now.isoformat(),
    "egypt_active_computed": egypt,
    "active_endpoint_count": len(active_api) if isinstance(active_api, list) else active_api,
    "active_endpoint": [
        {
            "id": a.get("id"),
            "name": a.get("name"),
            "countryId": a.get("countryId"),
            "status": a.get("status"),
            "category": (a.get("product") or {}).get("categoryName"),
        }
        for a in (active_api if isinstance(active_api, list) else [])
    ],
}
with open("scripts/verify_egypt_active.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f"egypt_active={len(egypt)} endpoint={out['active_endpoint_count']}")
