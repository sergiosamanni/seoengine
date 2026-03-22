
import asyncio
import httpx
import re

async def check_site():
    url = "https://unrent.it"
    auth = ("admin2023", "guWt eRJ5 gYhz jd1c uqdB CVQL")
    
    async with httpx.AsyncClient(verify=False) as client:
        # 1. Check WP Settings
        print("Checking WP Settings...")
        resp = await client.get(f"{url}/wp-json/wp/v2/settings", auth=auth)
        if resp.status_code == 200:
            settings = resp.json()
            import json
            print(f"Settings: {json.dumps(settings, indent=2)}")
        else:
            print(f"Settings error: {resp.status_code}")

        # 2. Check Homepage for Mixed Content
        print("\nScanning Homepage for insecure links...")
        resp = await client.get(url, timeout=15.0)
        if resp.status_code == 200:
            content = resp.text
            insecure = re.findall(r'http://[^\s"\'>]+', content)
            print(f"Found {len(insecure)} insecure links.")
            
            # Find CSS files
            css_files = re.findall(r'href=["\'](https?://[^\s"\'>]+\.css)["\']', content)
            print(f"\nChecking {len(css_files)} CSS files for insecure font imports...")
            for css_url in css_files[:10]: # Check first 10
                try:
                    css_resp = await client.get(css_url)
                    if "@import" in css_resp.text and "http://" in css_resp.text:
                         print(f" ! Found potential insecure import in {css_url}")
                    if "url(http://" in css_resp.text:
                         print(f" ! Found insecure font/image URL in {css_url}")
                except:
                    pass

if __name__ == "__main__":
    asyncio.run(check_site())
