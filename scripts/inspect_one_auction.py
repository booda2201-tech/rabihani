import json

for name in ["auction105.json", "auction104.json"]:
    with open(name, encoding="utf-8") as f:
        data = json.load(f)
    print("====", name)
    print(json.dumps(data, ensure_ascii=False, indent=2)[:3000])
    print()

with open("auctions.json", encoding="utf-8") as f:
    auctions = json.load(f)
print("==== sample auction keys")
print(sorted(auctions[0].keys()))
print(json.dumps(auctions[0], ensure_ascii=False, indent=2)[:2500])
