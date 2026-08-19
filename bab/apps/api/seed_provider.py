"""Seed SauceNAO provider into the database."""
import psycopg2

conn = psycopg2.connect('postgresql://bab_user:bab_password@localhost:5432/bab_db')
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
    INSERT INTO search_providers (name, slug, api_base_url, is_enabled, supports_visual_search, priority, timeout_ms, daily_quota)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (slug) DO UPDATE SET is_enabled = true
""", (
    'SauceNAO',
    'saucenao',
    'https://saucenao.com/search.php',
    True,
    True,
    10,
    30000,
    100,
))
conn.commit()
print('SauceNAO provider seeded successfully')
cur.close()
conn.close()
