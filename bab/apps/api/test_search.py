"""Test the full search flow."""
import httpx
import asyncio
import os

BASE = "http://localhost:8000"

async def main():
    async with httpx.AsyncClient(timeout=60) as c:
        # Login
        r = await c.post(f"{BASE}/api/auth/login", json={"email": "user@bab.app", "password": "user123"})
        if r.status_code != 200:
            print(f"Login failed: {r.status_code} {r.text}")
            return
        token = r.json()["token"]
        print(f"Login OK: {token[:20]}...")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create test image
        from PIL import Image
        img = Image.new("RGB", (200, 200), color="red")
        img.save("test_search.jpg")
        print("Test image created")
        
        # Search
        with open("test_search.jpg", "rb") as f:
            r = await c.post(
                f"{BASE}/api/search",
                headers=headers,
                files={"file": ("test.jpg", f, "image/jpeg")},
                data={"consent_confirmed": "true", "is_private": "false"},
            )
        
        print(f"Search response: {r.status_code}")
        if r.status_code != 200:
            print(f"Error: {r.text}")
            return
        
        data = r.json()
        search_id = data["search_id"]
        print(f"Search created: {search_id} (status: {data['status']})")
        
        # Poll status
        for i in range(30):
            await asyncio.sleep(2)
            r = await c.get(f"{BASE}/api/search/{search_id}/status", headers=headers)
            status = r.json()
            print(f"  [{i+1}] Status: {status['status']}, results: {status.get('total_results', 0)}")
            if status["status"] in ("completed", "failed"):
                break
        
        # Get results
        r = await c.get(f"{BASE}/api/search/{search_id}/results", headers=headers)
        results = r.json()
        print(f"\nResults: {results['total_results']}")
        print(f"Best similarity: {results.get('best_similarity', 'N/A')}")
        print(f"Providers: {results.get('providers_used', [])}")
        for res in results.get("results", [])[:5]:
            print(f"  - {res.get('page_title', 'N/A')} ({res.get('final_score', 0):.1f}%) [{res.get('domain', '')}]")
        
        # Cleanup
        os.remove("test_search.jpg")

asyncio.run(main())
