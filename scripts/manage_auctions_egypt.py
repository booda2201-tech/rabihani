"""
Stop active auctions, delete their products, create 4 new Egypt auctions.
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


def is_active(a: dict, now: datetime) -> bool:
    status = a.get("status")
    start = a.get("startTime")
    end = a.get("endTime")
    try:
        st = datetime.fromisoformat(start.replace("Z", "+00:00")) if start else None
        et = datetime.fromisoformat(end.replace("Z", "+00:00")) if end else None
    except Exception:
        return False
    current = a.get("currentHighestBid") or a.get("startPoints") or 0
    target = a.get("limited") or 0
    is_started = st is not None and now >= st
    is_not_ended = et is not None and now < et
    target_ok = target == 0 or current < target
    return (status == 1 or (status == 0 and is_started)) and is_not_ended and target_ok


def main() -> None:
    s = session()
    now = datetime.now(timezone.utc)
    past = (now - timedelta(minutes=2)).strftime("%Y-%m-%dT%H:%M:%SZ")

    auctions = s.get(f"{BASE}/AuctionRooms", timeout=TIMEOUT).json()
    if isinstance(auctions, dict):
        auctions = auctions.get("data", [])

    active = [a for a in auctions if is_active(a, now)]
    # Also include auctions that were active at session start / already ended during probe
    known_active_ids = {105, 104, 103, 101, 102}
    by_id = {a["id"]: a for a in auctions}
    targets = {a["id"] for a in active} | (known_active_ids & set(by_id))
    log(f"Active now: {len(active)}; targets to stop/clean: {sorted(targets)}")

    product_ids: set[int] = set()
    auction_ids: list[int] = []

    for aid in sorted(targets):
        detail = s.get(f"{BASE}/AuctionRooms/{aid}", timeout=TIMEOUT).json()
        if not isinstance(detail, dict) or "id" not in detail:
            log(f"Skip auction {aid}: not found")
            continue
        prod = detail.get("product") or {}
        pid = prod.get("id")
        log(
            f"Stopping auction {aid} ({detail.get('name')}) "
            f"country={detail.get('countryId')} product={pid} {prod.get('name')} "
            f"status={detail.get('status')}"
        )
        payload = {
            "id": aid,
            "roomName": detail.get("name"),
            "productId": pid,
            "startPoints": detail.get("startPoints"),
            "startTime": detail.get("startTime"),
            "endTime": past,
            "limited": detail.get("limited"),
            "countryId": detail.get("countryId"),
        }
        r = s.put(f"{BASE}/AuctionRooms/{aid}", json=payload, timeout=TIMEOUT)
        status_val = r.json().get("status") if r.ok else r.text[:200]
        log(f"  PUT endTime past => {r.status_code} status={status_val}")
        auction_ids.append(aid)
        if pid:
            product_ids.add(pid)

    # Delete auction rooms so products can be removed
    for aid in auction_ids:
        r = s.delete(f"{BASE}/AuctionRooms/{aid}", timeout=TIMEOUT)
        log(f"DELETE AuctionRoom {aid} => {r.status_code} {(r.text or '')[:200]}")

    # Delete products that were in those auctions
    for pid in sorted(product_ids):
        r = s.delete(f"{BASE}/Products/{pid}", timeout=TIMEOUT)
        log(f"DELETE Product {pid} => {r.status_code} {(r.text or '')[:200]}")

    # Pick 4 products for new Egypt auctions (not deleted)
    products = s.get(f"{BASE}/Products", timeout=TIMEOUT).json()
    products = sorted(products, key=lambda p: p["id"])
    chosen = products[:4]
    if len(chosen) < 4:
        raise SystemExit(f"Need 4 products, found {len(chosen)}")

    start = now + timedelta(minutes=1)
    end = now + timedelta(days=3)
    start_s = start.strftime("%Y-%m-%dT%H:%M:%SZ")
    end_s = end.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Varied auction configs
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
        log(f"POST auction for product {prod['id']} ({prod['name']}) => {r.status_code}")
        if r.ok:
            created.append(r.json())
            log(f"  created id={r.json().get('id')} country={r.json().get('countryId')}")
        else:
            log(f"  error: {r.text[:400]}")

    # Verify
    rooms = s.get(f"{BASE}/AuctionRooms", timeout=TIMEOUT).json()
    if isinstance(rooms, dict):
        rooms = rooms.get("data", [])
    now2 = datetime.now(timezone.utc)
    active2 = [a for a in rooms if is_active(a, now2)]
    egypt_active = [a for a in active2 if a.get("countryId") == EGYPT_COUNTRY_ID]
    egypt_all = [a for a in rooms if a.get("countryId") == EGYPT_COUNTRY_ID and a.get("status") in (0, 1)]

    summary = {
        "stopped_and_deleted_auctions": auction_ids,
        "deleted_products": sorted(product_ids),
        "created_auctions": [
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "countryId": c.get("countryId"),
                "productId": (c.get("product") or {}).get("id"),
                "startTime": c.get("startTime"),
                "endTime": c.get("endTime"),
                "startPoints": c.get("startPoints"),
                "limited": c.get("limited"),
                "status": c.get("status"),
            }
            for c in created
        ],
        "active_now_total": len(active2),
        "egypt_active_or_upcoming": [
            {"id": a.get("id"), "name": a.get("name"), "status": a.get("status")}
            for a in egypt_all
        ],
    }
    out = "scripts/manage_auctions_result.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    log(f"Summary written to {out}")
    log(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
