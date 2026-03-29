import sqlite3
from werkzeug.security import generate_password_hash

DB = 'database.db'

def init_db():
    conn = sqlite3.connect(DB)
    c = conn.cursor()

    c.execute('''
    CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
    ''')

    c.execute('''
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        age INTEGER,
        course TEXT,
        phone TEXT
    )
    ''')

    # insert default admin if not exists
    hashed = generate_password_hash('admin123')
    try:
        c.execute("INSERT INTO admin (username, password) VALUES (?, ?)", ('admin', hashed))
    except sqlite3.IntegrityError:
        pass

    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print('Initialized database and created default admin (admin / admin123)')
