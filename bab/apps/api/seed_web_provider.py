"""Seed web search provider."""
import psycopg2

conn = psycopg2.connect("postgresql://bab_user:bab_password@localhost:5432/bab_db")
conn.autocommit = True
cur = conn.cursor()

# Disable SauceNAO (no API key)
cur.execute("UPDATE search_providers SET is_enabled = false WHERE slug = 'saucenao'")

# Add web search provider
cur.execute("""
    INSERT INTO search_providers (name, slug, api_base_url, is_enabled, supports_visual_search, priority, timeout_ms, daily_quota)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (slug) DO UPDATE SET is_enabled = true
""", (
    "Web Search (Google Lens, Yandex, Bing)",
    "web-search",
    "https://web-search.local",
    True,
    True,
    5,
    30000,
    100,
))

conn.commit()
print("Web search provider seeded successfully")
cur.close()
conn.close()
