"""Replace 3 Egypt auctions whose product photos look wrong."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
TIMEOUT = 60
EGYPT_COUNTRY_ID = 3
STOP_IDS = [123, 125, 127]
# Products we already uploaded HQ transparent photos for
REPLACEMENTS = [
    {"productId": 40, "startPoints": 150},  # Apple AirPods 4
    {"productId": 36, "startPoints": 180},  # Sony WH-CH520
    {"productId": 50, "startPoints": 120},  # Braun Hand Blender
]


def main() -> None:
    s = requests.Session()
    products = {p["id"]: p for p in s.get(f"{BASE}/Products", timeout=TIMEOUT).json()}
    now = datetime.now(timezone.utc)
    past = (now - timedelta(minutes=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    end_s = datetime(2026, 11, 2, 7, 28, 52, tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    start_s = (now - timedelta(seconds=20)).strftime("%Y-%m-%dT%H:%M:%SZ")

    stopped = []
    for aid in STOP_IDS:
        room = s.get(f"{BASE}/AuctionRooms/{aid}", timeout=TIMEOUT)
        if room.status_code != 200:
            stopped.append({"id": aid, "error": f"get {room.status_code}"})
            print(f"GET {aid} => {room.status_code}", flush=True)
            continue
        a = room.json()
        payload = {
            "id": aid,
            "roomName": a.get("name"),
            "productId": (a.get("product") or {}).get("id"),
            "startPoints": a.get("startPoints"),
            "startTime": a.get("startTime"),
            "endTime": past,
            "limited": a.get("limited"),
            "countryId": a.get("countryId"),
        }
        r = s.put(f"{BASE}/AuctionRooms/{aid}", json=payload, timeout=TIMEOUT)
        print(f"STOP {aid} {a.get('name')} => {r.status_code}", flush=True)
        stopped.append({"id": aid, "name": a.get("name"), "status": r.status_code})

    created = []
    errors = []
    for item in REPLACEMENTS:
        prod = products[item["productId"]]
        payload = {
            "roomName": prod["name"],
            "productId": prod["id"],
            "startPoints": item["startPoints"],
            "startTime": start_s,
            "endTime": end_s,
            "limited": round(float(prod.get("price") or 0) * 1.3),
            "countryId": EGYPT_COUNTRY_ID,
        }
        r = s.post(f"{BASE}/AuctionRooms", json=payload, timeout=TIMEOUT)
        print(f"POST {prod['name']} => {r.status_code}", flush=True)
        if r.ok:
            body = r.json()
            created.append(body)
            print(f"  id={body.get('id')} limited={body.get('limited')}", flush=True)
        else:
            errors.append({"product": prod["name"], "status": r.status_code, "body": (r.text or "")[:300]})
            print((r.text or "")[:300], flush=True)

    rooms = s.get(f"{BASE}/AuctionRooms", timeout=TIMEOUT).json()
    if isinstance(rooms, dict):
        rooms = rooms.get("data", [])

    def alive(a):
        end = a.get("endTime")
        try:
            et = datetime.fromisoformat(end.replace("Z", "+00:00"))
        except Exception:
            return False
        current = a.get("currentHighestBid") or a.get("startPoints") or 0
        target = a.get("limited") or 0
        return a.get("countryId") == EGYPT_COUNTRY_ID and now < et and (target == 0 or current < target) and a.get("status") in (0, 1)

    active = [a for a in rooms if alive(a)]
    summary = {
        "stopped": stopped,
        "created": [
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "productId": (c.get("product") or {}).get("id"),
                "categoryName": (c.get("product") or {}).get("categoryName"),
                "startPoints": c.get("startPoints"),
                "limited": c.get("limited"),
                "endTime": c.get("endTime"),
                "status": c.get("status"),
            }
            for c in created
        ],
        "errors": errors,
        "egypt_active": [
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "categoryName": (a.get("product") or {}).get("categoryName"),
                "endTime": a.get("endTime"),
            }
            for a in active
        ],
    }
    Path(__file__).with_name("replace_bad_image_auctions_result.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"created={len(created)} active={len(active)}", flush=True)


if __name__ == "__main__":
    main()
