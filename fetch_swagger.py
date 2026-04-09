import urllib.request
import json

urls = [
    "http://localhost:4200/swagger/v1/swagger.json",
    "http://localhost:4200/api/swagger/v1/swagger.json",
    "http://localhost:5000/swagger/v1/swagger.json"
]

for url in urls:
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"Success on {url}")
            paths = list(data.get('paths', {}).keys())
            print("Paths containing 'products' or 'Catalog' or 'Cart':")
            for p in paths:
                if 'product' in p.lower() or 'catalog' in p.lower() or 'cart' in p.lower():
                    print("- " + p)
            break
    except Exception as e:
        print(f"Failed {url}: {e}")
