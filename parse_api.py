import json
import sys

try:
    with open('C:/Users/mosta/.gemini/antigravity/brain/48da3e61-d62e-4044-8979-479c54b5d295/.system_generated/steps/783/content.md', 'r', encoding='utf-8') as f:
        content = f.read()
        
        # Remove markdown if present
        if content.startswith('```'):
            content = '\n'.join(content.split('\n')[1:-1])
            
        spec = json.loads(content)
        
        print('--- CATEGORY API ---')
        print(json.dumps(spec['paths'].get('/api/Category/GetAllCategories'), indent=2))
        
        print('\n--- CUSTOMER DESIGNS ---')
        print(json.dumps(spec['paths'].get('/api/customers/me/designs'), indent=2))
        
        for p in spec['paths'].keys():
            if '/api/customers/me/designs/' in p and 'images' in p:
                print(f'\nPath: {p}')
                print(json.dumps(spec['paths'][p], indent=2))
except Exception as e:
    print(f'Error: {e}')
