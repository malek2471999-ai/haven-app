"""Direct orchestrator test - no async task wrapping."""
import asyncio
import os
os.environ["DATABASE_URL"] = "postgresql://bab_user:bab_password@localhost:5432/bab_db"
os.environ["ENVIRONMENT"] = "development"

from app.services.search_orchestrator import SearchOrchestrator

async def main():
    orch = SearchOrchestrator()
    # Use the latest stuck search
    search_id = "92274edf-28f3-43ac-86ab-a27ef2820c30"
    try:
        await orch.process_search(search_id)
    except Exception as e:
        print(f"EXCEPTION: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(main())
