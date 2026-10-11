"""Create 6 mixed Egypt auctions lasting one month."""
from __future__ import annotations

import json
import random
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
TIMEOUT = 60
EGYPT_COUNTRY_ID = 3
OUT = Path(__file__).with_name("create_egypt_month_auctions_result.json")
START_POINTS = [100, 150, 200, 180, 250, 120]


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


def pick_mixed_products(products: list[dict], busy_ids: set[int], count: int = 6) -> list[dict]:
    by_cat: dict[int, list[dict]] = defaultdict(list)
    for p in products:
        cid = p.get("categoryId")
        if cid is None or p.get("id") in busy_ids:
            continue
        if not (p.get("imageUrl") or "").strip():
            continue
        by_cat[int(cid)].append(p)

    if not by_cat:
        raise SystemExit("No categorized products found")

    rng = random.Random()
    chosen: list[dict] = []
    used_ids: set[int] = set()

    # Round-robin across categories so the 6 stay mixed
    cats = [cid for cid in sorted(by_cat)]
    while len(chosen) < count and cats:
        progressed = False
        for cid in list(cats):
            pool = [p for p in by_cat[cid] if p["id"] not in used_ids]
            if not pool:
                cats.remove(cid)
                continue
            pick = rng.choice(pool)
            chosen.append(pick)
            used_ids.add(pick["id"])
            progressed = True
            if len(chosen) >= count:
                break
        if not progressed:
            break

    if len(chosen) < count:
        raise SystemExit(f"Need {count} products, could only pick {len(chosen)}")
    rng.shuffle(chosen)
    return chosen[:count]


def main() -> None:
    s = session()
    products = s.get(f"{BASE}/Products", timeout=TIMEOUT).json()
    rooms = s.get(f"{BASE}/AuctionRooms", timeout=TIMEOUT).json()
    if isinstance(rooms, dict):
        rooms = rooms.get("data", [])

    now = datetime.now(timezone.utc)
    busy_ids = {
        (a.get("product") or {}).get("id")
        for a in rooms
        if a.get("countryId") == EGYPT_COUNTRY_ID and is_active(a, now)
    }
    busy_ids.discard(None)

    chosen = pick_mixed_products(products, busy_ids, 6)
    start_s = (now - timedelta(seconds=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
    end_s = (now + timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")

    created = []
    errors = []
    for prod, start_points in zip(chosen, START_POINTS):
        price = float(prod.get("price") or 0)
        payload = {
            "roomName": prod["name"],
            "productId": prod["id"],
            "startPoints": start_points,
            "startTime": start_s,
            "endTime": end_s,
            "limited": round(price * 1.3),
            "countryId": EGYPT_COUNTRY_ID,
        }
        r = s.post(f"{BASE}/AuctionRooms", json=payload, timeout=TIMEOUT)
        print(f"POST {prod.get('categoryId')} {prod['name']} => {r.status_code}", flush=True)
        if r.ok:
            body = r.json()
            created.append(body)
            print(f"  id={body.get('id')} limited={body.get('limited')}", flush=True)
        else:
            errors.append({"product": prod["name"], "status": r.status_code, "body": (r.text or "")[:400]})
            print(f"  error: {(r.text or '')[:300]}", flush=True)

    rooms2 = s.get(f"{BASE}/AuctionRooms", timeout=TIMEOUT).json()
    if isinstance(rooms2, dict):
        rooms2 = rooms2.get("data", [])
    now2 = datetime.now(timezone.utc)
    egypt_active = [
        a for a in rooms2
        if a.get("countryId") == EGYPT_COUNTRY_ID and is_active(a, now2)
    ]

    summary = {
        "now": now2.isoformat(),
        "startTime": start_s,
        "endTime": end_s,
        "picked_products": [
            {
                "id": p["id"],
                "name": p["name"],
                "categoryId": p.get("categoryId"),
                "categoryName": p.get("categoryName"),
                "price": p.get("price"),
            }
            for p in chosen
        ],
        "created_auctions": [
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "productId": (c.get("product") or {}).get("id"),
                "categoryId": (c.get("product") or {}).get("categoryId"),
                "categoryName": (c.get("product") or {}).get("categoryName"),
                "countryId": c.get("countryId"),
                "startPoints": c.get("startPoints"),
                "limited": c.get("limited"),
                "startTime": c.get("startTime"),
                "endTime": c.get("endTime"),
                "status": c.get("status"),
            }
            for c in created
        ],
        "errors": errors,
        "egypt_active_now": [
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "status": a.get("status"),
                "categoryId": (a.get("product") or {}).get("categoryId"),
                "categoryName": (a.get("product") or {}).get("categoryName"),
                "endTime": a.get("endTime"),
            }
            for a in egypt_active
        ],
    }
    OUT.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"created={len(created)} egypt_active={len(egypt_active)}", flush=True)


if __name__ == "__main__":
    main()
