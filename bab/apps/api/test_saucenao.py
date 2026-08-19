import asyncio
import aiofiles
import httpx

async def test():
    path = "uploads/8b1e844b-52a0-44d0-875e-4fdb0354e08e/test.jpg"
    async with aiofiles.open(path, "rb") as f:
        image_data = await f.read()
    print(f"Image size: {len(image_data)} bytes")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://saucenao.com/search.php",
                params={"output_type": "2", "numres": "5"},
                files={"file": ("test.jpg", image_data, "image/jpeg")},
            )
            print(f"Status: {r.status_code}")
            data = r.json()
            results = data.get("results", [])
            print(f"Results: {len(results)}")
            for res in results[:3]:
                h = res.get("header", {})
                d = res.get("data", {})
                sim = h.get("similarity", "?")
                idx = h.get("index_name", "?")
                print(f"  {sim}% - {idx}")
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")

asyncio.run(test())
