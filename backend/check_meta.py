
import asyncio
import httpx
import json

async def check_page_meta():
    page_id = 9401
    url = f"https://unrent.it/wp-json/wp/v2/pages/{page_id}"
    auth = ("admin2023", "guWt eRJ5 gYhz jd1c uqdB CVQL")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, auth=auth, timeout=15.0)
        if resp.status_code == 200:
            data = resp.json()
            print("PAGE DATA:")
            print(f"Title: {data.get('title', {}).get('rendered')}")
            print(f"Status: {data.get('status')}")
            print("\nMETADATA:")
            print(json.dumps(data.get("meta", {}), indent=2))
        else:
            print(f"Error: {resp.status_code}")
            print(resp.text)

if __name__ == "__main__":
    asyncio.run(check_page_meta())
