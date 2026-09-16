"""Probe how to stop/cancel an auction room via API."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import requests

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
TIMEOUT = 45


def dump(label, r):
    print(f"\n=== {label} => {r.status_code}")
    text = (r.text or "")[:800]
    print(text)


s = requests.Session()

# Try OPTIONS / discover endpoints
for path in [
    "/AuctionRooms",
    "/AuctionRooms/105",
    "/AuctionRooms/105/cancel",
    "/AuctionRooms/cancel/105",
    "/AuctionRooms/105/finish",
    "/AuctionRooms/105/stop",
]:
    try:
        r = s.options(BASE + path, timeout=TIMEOUT)
        dump(f"OPTIONS {path}", r)
        print("Allow:", r.headers.get("Allow"))
    except Exception as e:
        print(f"OPTIONS {path} err: {e}")

# Try DELETE
r = s.delete(f"{BASE}/AuctionRooms/999999", timeout=TIMEOUT)
dump("DELETE nonexistent", r)

# Get auction 104 (Kuwait, no bids - safer probe target conceptually; we'll restore)
r = s.get(f"{BASE}/AuctionRooms/104", timeout=TIMEOUT)
a = r.json()
print("\nCurrent 104:", json.dumps({k: a[k] for k in ["id", "name", "status", "isCancelled", "endTime", "startTime", "startPoints", "limited", "countryId"]}, ensure_ascii=False))

payload_base = {
    "id": 104,
    "roomName": a["name"],
    "productId": a["product"]["id"],
    "startPoints": a["startPoints"],
    "startTime": a["startTime"],
    "endTime": a["endTime"],
    "limited": a["limited"],
    "countryId": a["countryId"],
}

# Try cancel flag
p1 = {**payload_base, "isCancelled": True}
r = s.put(f"{BASE}/AuctionRooms/104", json=p1, timeout=TIMEOUT)
dump("PUT isCancelled=true", r)

r = s.get(f"{BASE}/AuctionRooms/104", timeout=TIMEOUT)
print("After cancel:", r.json().get("isCancelled"), r.json().get("status"))

# Try status=2
p2 = {**payload_base, "status": 2}
r = s.put(f"{BASE}/AuctionRooms/104", json=p2, timeout=TIMEOUT)
dump("PUT status=2", r)
r = s.get(f"{BASE}/AuctionRooms/104", timeout=TIMEOUT)
print("After status2:", r.json().get("status"), r.json().get("isCancelled"))

# Try endTime in past
past = (datetime.now(timezone.utc) - timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ")
p3 = {**payload_base, "endTime": past}
r = s.put(f"{BASE}/AuctionRooms/104", json=p3, timeout=TIMEOUT)
dump("PUT endTime past", r)
r = s.get(f"{BASE}/AuctionRooms/104", timeout=TIMEOUT)
print("After past end:", r.json().get("endTime"), r.json().get("status"))

# Try cancel endpoints
for method, path in [
    ("POST", "/AuctionRooms/104/cancel"),
    ("PUT", "/AuctionRooms/104/cancel"),
    ("POST", "/AuctionRooms/cancel/104"),
    ("POST", "/AuctionRooms/104/finish"),
    ("PATCH", "/AuctionRooms/104"),
]:
    try:
        fn = getattr(s, method.lower())
        body = {"isCancelled": True} if "PATCH" in method or "cancel" in path else None
        r = fn(BASE + path, json=body, timeout=TIMEOUT)
        dump(f"{method} {path}", r)
    except Exception as e:
        print(method, path, e)
