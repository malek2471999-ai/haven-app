import asyncio, asyncpg
async def main():
    conn = await asyncpg.connect('postgresql://bab_user:bab_password@localhost:5432/bab_db')
    providers = await conn.fetch('SELECT id, name, is_enabled FROM search_providers')
    print('Providers:')
    for p in providers:
        print(f'  {p["name"]} enabled={p["is_enabled"]}')
    
    searches = await conn.fetch('SELECT id, status, error_message FROM searches ORDER BY created_at DESC LIMIT 3')
    print('Recent searches:')
    for s in searches:
        print(f'  {s["id"]} status={s["status"]} error={s["error_message"]}')
    await conn.close()
asyncio.run(main())
