"""
Delete leftover auction rooms linked to target products, then delete products,
then recreate 4 Egypt auctions with other products.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
TIMEOUT = 60
EGYPT_COUNTRY_ID = 3
TARGET_PRODUCTS = {1, 4, 5, 10, 15}


def log(msg: str) -> None:
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"), flush=True)


def session() -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=4,
        connect=4,
        read=4,
        backoff_factor=1.2,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "POST", "PUT", "DELETE"]),
    )
    adapter = HTTPAdapter(max_retries=retry)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s


def main() -> None:
    s = session()
    rooms = s.get(f"{BASE}/AuctionRooms", timeout=TIMEOUT).json()
    if isinstance(rooms, dict):
        rooms = rooms.get("data", [])

    linked_room_ids = []
    for a in rooms:
        detail = s.get(f"{BASE}/AuctionRooms/{a['id']}", timeout=TIMEOUT).json()
        prod = detail.get("product") or {}
        pid = prod.get("id")
        if pid in TARGET_PRODUCTS:
            linked_room_ids.append((a["id"], pid, detail.get("name"), detail.get("status")))
            log(f"Linked room {a['id']} -> product {pid} ({prod.get('name')}) status={detail.get('status')}")

    # Also delete newly created Egypt auctions 106-109 so we recreate cleanly
    recreate_ids = [106, 107, 108, 109]
    for aid in recreate_ids:
        if aid not in [x[0] for x in linked_room_ids]:
            linked_room_ids.append((aid, None, "new egypt", None))

    seen = set()
    for aid, pid, name, status in linked_room_ids:
        if aid in seen:
            continue
        seen.add(aid)
        r = s.delete(f"{BASE}/AuctionRooms/{aid}", timeout=TIMEOUT)
        log(f"DELETE room {aid} ({name}) => {r.status_code} {(r.text or '')[:150]}")

    for pid in sorted(TARGET_PRODUCTS):
        r = s.delete(f"{BASE}/Products/{pid}", timeout=TIMEOUT)
        log(f"DELETE product {pid} => {r.status_code} {(r.text or '')[:200]}")

    products = s.get(f"{BASE}/Products", timeout=TIMEOUT).json()
    products = sorted(products, key=lambda p: p["id"])
    chosen = products[:4]
    log(f"Chosen products for new auctions: {[p['id'] for p in chosen]}")
    if len(chosen) < 4:
        raise SystemExit(f"Need 4 products, found {len(chosen)}")

    now = datetime.now(timezone.utc)
    start = now + timedelta(minutes=1)
    end = now + timedelta(days=3)
    start_s = start.strftime("%Y-%m-%dT%H:%M:%SZ")
    end_s = end.strftime("%Y-%m-%dT%H:%M:%SZ")
    configs = [
        {"startPoints": 100, "limited": 2000},
        {"startPoints": 200, "limited": 5000},
        {"startPoints": 150, "limited": 3000},
        {"startPoints": 250, "limited": 8000},
    ]

    created = []
    for prod, cfg in zip(chosen, configs):
        payload = {
            "roomName": prod["name"],
            "productId": prod["id"],
            "startPoints": cfg["startPoints"],
            "startTime": start_s,
            "endTime": end_s,
            "limited": cfg["limited"],
            "countryId": EGYPT_COUNTRY_ID,
        }
        r = s.post(f"{BASE}/AuctionRooms", json=payload, timeout=TIMEOUT)
        log(f"POST auction product {prod['id']} ({prod['name']}) => {r.status_code}")
        if r.ok:
            created.append(r.json())
            log(f"  id={r.json().get('id')} country={r.json().get('countryId')}")
        else:
            log(f"  err: {r.text[:300]}")

    # verify products deleted
    left = s.get(f"{BASE}/Products", timeout=TIMEOUT).json()
    left_ids = {p["id"] for p in left}
    still = TARGET_PRODUCTS & left_ids

    summary = {
        "deleted_rooms": sorted(seen),
        "target_products_still_exist": sorted(still),
        "products_remaining_count": len(left),
        "created_auctions": [
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "countryId": c.get("countryId"),
                "productId": (c.get("product") or {}).get("id"),
                "startPoints": c.get("startPoints"),
                "limited": c.get("limited"),
                "startTime": c.get("startTime"),
                "endTime": c.get("endTime"),
                "status": c.get("status"),
            }
            for c in created
        ],
    }
    with open("scripts/manage_auctions_result2.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    log(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
