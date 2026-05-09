import sqlite3
import os
import pickle
from datetime import datetime

FACE_RECOGNITION_AVAILABLE = False

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT_DIR, 'data', 'users.db')

SQL_CREATE_USERS = '''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    face_encoding BLOB,
    created_at TEXT NOT NULL
);
'''


def ensure_database():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute(SQL_CREATE_USERS)
    conn.commit()
    conn.close()


def get_connection():
    ensure_database()
    return sqlite3.connect(DB_PATH)


def create_user(username: str, password_hash: str, face_encoding=None) -> bool:
    conn = get_connection()
    try:
        face_blob = pickle.dumps(face_encoding) if face_encoding else None
        conn.execute(
            'INSERT INTO users (username, password_hash, face_encoding, created_at) VALUES (?, ?, ?, ?)',
            (username, password_hash, face_blob, datetime.utcnow().isoformat())
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def find_user(username: str):
    conn = get_connection()
    cursor = conn.execute('SELECT id, username, password_hash, face_encoding FROM users WHERE username = ?', (username,))
    row = cursor.fetchone()
    conn.close()
    if row:
        face_encoding = pickle.loads(row[3]) if row[3] else None
        return row[0], row[1], row[2], face_encoding
    return None


def find_user_by_face(face_encoding):
    if not FACE_RECOGNITION_AVAILABLE:
        # For basic face detection, just return first user with face data
        conn = get_connection()
        cursor = conn.execute('SELECT username FROM users WHERE face_encoding IS NOT NULL LIMIT 1')
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else None

    conn = get_connection()
    cursor = conn.execute('SELECT id, username, password_hash, face_encoding FROM users')
    rows = cursor.fetchall()
    conn.close()
    import face_recognition
    for row in rows:
        stored_encoding = pickle.loads(row[3]) if row[3] else None
        if stored_encoding and face_recognition.compare_faces([stored_encoding], face_encoding)[0]:
            return row[1]  # username
    return None
