"""Create 4 random Egypt auctions, one mix covering every product category."""
from __future__ import annotations

import json
import random
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
TIMEOUT = 60
EGYPT_COUNTRY_ID = 3
OUT = "scripts/create_egypt_mixed_auctions_result.json"


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


def pick_mixed_products(products: list[dict], count: int = 4) -> list[dict]:
    by_cat: dict[int, list[dict]] = defaultdict(list)
    for p in products:
        cid = p.get("categoryId")
        if cid is None:
            continue
        by_cat[int(cid)].append(p)

    if not by_cat:
        raise SystemExit("No categorized products found")

    rng = random.Random()
    chosen: list[dict] = []
    used_ids: set[int] = set()

    # One random product from every category first
    for cid in sorted(by_cat):
        pool = [p for p in by_cat[cid] if p["id"] not in used_ids]
        if not pool:
            continue
        pick = rng.choice(pool)
        chosen.append(pick)
        used_ids.add(pick["id"])

    # Fill remaining slots from leftover categories, still mixing
    leftover_cats = [cid for cid in by_cat if any(p["id"] not in used_ids for p in by_cat[cid])]
    while len(chosen) < count and leftover_cats:
        cid = rng.choice(leftover_cats)
        pool = [p for p in by_cat[cid] if p["id"] not in used_ids]
        if not pool:
            leftover_cats = [c for c in leftover_cats if c != cid]
            continue
        pick = rng.choice(pool)
        chosen.append(pick)
        used_ids.add(pick["id"])
        leftover_cats = [c for c in leftover_cats if any(p["id"] not in used_ids for p in by_cat[c])]

    if len(chosen) < count:
        raise SystemExit(f"Need {count} products, could only pick {len(chosen)}")

    rng.shuffle(chosen)
    return chosen[:count]


def main() -> None:
    s = session()
    products = s.get(f"{BASE}/Products", timeout=TIMEOUT).json()
    chosen = pick_mixed_products(products, 4)

    now = datetime.now(timezone.utc)
    start_s = (now - timedelta(seconds=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
    end_s = (now + timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%SZ")
    configs = [
        {"startPoints": 100, "limited": 2000},
        {"startPoints": 200, "limited": 5000},
        {"startPoints": 150, "limited": 3000},
        {"startPoints": 250, "limited": 8000},
    ]

    created = []
    errors = []
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
        log(f"POST {prod.get('categoryName')} / {prod['name']} => {r.status_code}")
        if r.ok:
            body = r.json()
            created.append(body)
            log(f"  id={body.get('id')} country={body.get('countryId')} status={body.get('status')}")
        else:
            errors.append({"product": prod["name"], "status": r.status_code, "body": (r.text or "")[:400]})
            log(f"  error: {(r.text or '')[:300]}")

    rooms = s.get(f"{BASE}/AuctionRooms", timeout=TIMEOUT).json()
    if isinstance(rooms, dict):
        rooms = rooms.get("data", [])
    now2 = datetime.now(timezone.utc)
    egypt_active = [
        a for a in rooms
        if a.get("countryId") == EGYPT_COUNTRY_ID and is_active(a, now2)
    ]

    summary = {
        "now": now2.isoformat(),
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
            }
            for a in egypt_active
        ],
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    log(f"Wrote {OUT}")
    log(f"created={len(created)} egypt_active={len(egypt_active)}")


if __name__ == "__main__":
    main()
