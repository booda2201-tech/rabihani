import json
import re
import requests

BASE = "http://alhendalcompany-001-site7.stempurl.com/api"
SKU_RE = re.compile(r"SKU:\s*([A-Z0-9-]+)", re.I)
s = requests.Session()
products = s.get(f"{BASE}/Products", timeout=60).json()
rows = []
for p in products:
    m = SKU_RE.search(p.get("description") or "")
    sku = m.group(1).upper() if m else ""
    url = p.get("imageUrl") or ""
    size = 0
    try:
        r = s.get(url, timeout=30)
        size = len(r.content)
    except Exception:
        size = -1
    rows.append((size, p["id"], p["name"], sku, url))
rows.sort()
for size, pid, name, sku, url in rows:
    print(f"{size:8}  id={pid:<4}  {sku:<22}  {name}")
