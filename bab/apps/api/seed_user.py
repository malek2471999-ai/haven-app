import psycopg2
from app.core.security import hash_password

conn = psycopg2.connect('postgresql://bab_user:bab_password@localhost:5432/bab_db')
conn.autocommit = True
cur = conn.cursor()
pwd = hash_password('bab123')
cur.execute(
    "INSERT INTO users (email, password_hash, full_name, role) VALUES (%s, %s, %s, %s) ON CONFLICT (email) DO NOTHING",
    ('admin@bab.app', pwd, 'Admin', 'admin')
)
conn.commit()
print('Admin user created: admin@bab.app / bab123')
cur.close()
conn.close()
