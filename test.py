from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import json

options = webdriver.ChromeOptions()
options.add_argument('--headless')
options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

driver = webdriver.Chrome(options=options)
driver.get("http://localhost:4200/customer/design")

time.sleep(3) # Wait for bootstrap

# Get initial logs
print("Initial logs:")
for entry in driver.get_log('browser'):
    print(entry)

try:
    # Open products modal
    tool_navs = driver.find_elements(By.CSS_SELECTOR, '.tool-btn[data-tool="products"]')
    if tool_navs:
        tool_navs[0].click()
        print("Clicked products tool")
        time.sleep(1)
        
        # Click the 2nd product if available
        cards = driver.find_elements(By.CSS_SELECTOR, '.product-card')
        print(f"Found {len(cards)} product cards")
        if len(cards) > 1:
            cards[1].click()
            print("Clicked second product card")
            time.sleep(1)
            
            # Get logs again
            print("Logs after clicking product:")
            for entry in driver.get_log('browser'):
                print(entry)
                
            # Print current photo src and swatches
            img = driver.find_element(By.ID, 'product-image')
            print(f"Current Photo SRC: {img.get_attribute('src')}")
            
            swatches = driver.find_elements(By.CSS_SELECTOR, '.color-swatch')
            print(f"Colors: {[s.get_attribute('data-color') for s in swatches]}")
except Exception as e:
    print(f"Error: {e}")

driver.quit()
