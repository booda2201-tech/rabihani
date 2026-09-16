"""
Clear remaining rooms blocking product deletes; recreate Egypt auctions
with products that are not the ones being removed.
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
TARGET_PRODUCTS = {1, 4, 10}  # still blocked


def log(msg: str) -> None:
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"), flush=True)


def session() -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=3,
        connect=3,
        read=3,
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

    # Probe bid delete endpoints using a known stuck room
    stuck = [92, 82, 81, 79]
    for aid in stuck:
        detail = s.get(f"{BASE}/AuctionRooms/{aid}", timeout=TIMEOUT)
        if detail.status_code != 200:
            log(f"room {aid} gone already: {detail.status_code}")
            continue
        data = detail.json()
        bids = data.get("bids") or []
        log(f"room {aid} product={(data.get('product') or {}).get('id')} bids={len(bids)}")
        for b in bids:
            bid_id = b.get("id")
            for path in [
                f"/Bids/{bid_id}",
                f"/AuctionRooms/{aid}/bids/{bid_id}",
                f"/AuctionBids/{bid_id}",
            ]:
                r = s.delete(BASE + path, timeout=TIMEOUT)
                if r.status_code != 404:
                    log(f"  DELETE {path} => {r.status_code} {(r.text or '')[:120]}")

        # try reassign product away then delete
        other_products = s.get(f"{BASE}/Products", timeout=TIMEOUT).json()
        other = next((p for p in other_products if p["id"] not in TARGET_PRODUCTS), None)
        if other:
            payload = {
                "id": aid,
                "roomName": data.get("name"),
                "productId": other["id"],
                "startPoints": data.get("startPoints"),
                "startTime": data.get("startTime"),
                "endTime": data.get("endTime"),
                "limited": data.get("limited"),
                "countryId": data.get("countryId"),
            }
            r = s.put(f"{BASE}/AuctionRooms/{aid}", json=payload, timeout=TIMEOUT)
            log(f"  reassign product -> {other['id']} => {r.status_code}")

        r = s.delete(f"{BASE}/AuctionRooms/{aid}", timeout=TIMEOUT)
        log(f"  DELETE room {aid} => {r.status_code} {(r.text or '')[:180]}")

    # Delete current Egypt auctions that reuse target products, then recreate clean set
    rooms = s.get(f"{BASE}/AuctionRooms", timeout=TIMEOUT).json()
    if isinstance(rooms, dict):
        rooms = rooms.get("data", [])

    egypt_new = [a for a in rooms if a.get("id") in (110, 111, 112, 113)]
    for a in egypt_new:
        r = s.delete(f"{BASE}/AuctionRooms/{a['id']}", timeout=TIMEOUT)
        log(f"DELETE egypt auction {a['id']} => {r.status_code}")

    for pid in sorted(TARGET_PRODUCTS):
        r = s.delete(f"{BASE}/Products/{pid}", timeout=TIMEOUT)
        log(f"DELETE product {pid} => {r.status_code} {(r.text or '')[:200]}")

    products = s.get(f"{BASE}/Products", timeout=TIMEOUT).json()
    # Prefer products not previously targeted
    prefer = [2, 3, 6, 9, 13, 24, 25, 26]
    by_id = {p["id"]: p for p in products}
    chosen = [by_id[i] for i in prefer if i in by_id][:4]
    if len(chosen) < 4:
        chosen = sorted(products, key=lambda p: p["id"])[:4]
    log(f"Chosen: {[(p['id'], p['name']) for p in chosen]}")

    now = datetime.now(timezone.utc)
    start_s = (now + timedelta(minutes=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    end_s = (now + timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%SZ")
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
        log(f"POST {prod['name']} => {r.status_code}")
        if r.ok:
            created.append(r.json())
            log(f"  id={r.json().get('id')}")
        else:
            log(r.text[:300])

    left = {p["id"] for p in s.get(f"{BASE}/Products", timeout=TIMEOUT).json()}
    summary = {
        "products_1_4_10_still_exist": sorted(TARGET_PRODUCTS & left),
        "created": [
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "productId": (c.get("product") or {}).get("id"),
                "countryId": c.get("countryId"),
                "startPoints": c.get("startPoints"),
                "limited": c.get("limited"),
                "startTime": c.get("startTime"),
                "endTime": c.get("endTime"),
                "status": c.get("status"),
            }
            for c in created
        ],
    }
    with open("scripts/manage_auctions_result3.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    log(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
