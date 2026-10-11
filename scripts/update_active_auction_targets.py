"""Set active auctions' limited target to product price + 30%."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import requests

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
TIMEOUT = 60


def main() -> None:
    s = requests.Session()
    rooms = s.get(f"{BASE}/AuctionRooms", timeout=TIMEOUT).json()
    now = datetime.now(timezone.utc)
    results = []

    for a in rooms:
        try:
            et = datetime.fromisoformat((a.get("endTime") or "").replace("Z", "+00:00"))
        except Exception:
            continue
        if not (et > now and a.get("status") == 1):
            continue

        prod = a.get("product") or {}
        price = float(prod.get("price") or 0)
        new_limited = round(price * 1.3)
        payload = {
            "id": a["id"],
            "roomName": a.get("name"),
            "productId": prod.get("id"),
            "startPoints": a.get("startPoints"),
            "startTime": a.get("startTime"),
            "endTime": a.get("endTime"),
            "limited": new_limited,
            "countryId": a.get("countryId"),
        }
        r = s.put(f"{BASE}/AuctionRooms/{a['id']}", json=payload, timeout=TIMEOUT)
        row = {
            "id": a["id"],
            "name": a.get("name"),
            "price": price,
            "startPoints": a.get("startPoints"),
            "oldLimited": a.get("limited"),
            "newLimited": new_limited,
            "status": r.status_code,
            "ok": r.ok,
        }
        results.append(row)
        print(f"{a['id']} {a.get('name')} {a.get('limited')} -> {new_limited} {r.status_code}", flush=True)

    out = Path(__file__).with_name("update_active_auction_targets_result.json")
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=True, indent=2), flush=True)


if __name__ == "__main__":
    main()
