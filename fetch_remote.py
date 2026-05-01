import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "http://localhost:5245/swagger/v1/swagger.json"
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode())
        print("PATHS:")
        for p in data.get('paths', {}).keys():
            if 'product' in p.lower() or 'catalog' in p.lower() or 'cart' in p.lower():
                print(p)
except Exception as e:
    print(e)
