
import asyncio
import httpx
import json

async def check_type_support():
    url = "https://unrent.it/wp-json/wp/v2/types/page"
    auth = ("admin2023", "guWt eRJ5 gYhz jd1c uqdB CVQL")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, auth=auth, timeout=15.0)
        if resp.status_code == 200:
            data = resp.json()
            print("TYPE DATA:")
            print(json.dumps(data, indent=2))
        else:
            print(f"Error: {resp.status_code}")
            print(resp.text)

if __name__ == "__main__":
    asyncio.run(check_type_support())
