from cryptography.fernet import Fernet
import hashlib
import os

KEY_FILE = os.path.join(os.path.dirname(__file__), "secret_login.key")

def load_key():
    return open(KEY_FILE, "rb").read()

fernet = Fernet(load_key())

def encrypt_data(data: bytes) -> bytes:
    return fernet.encrypt(data)

def decrypt_data(data: bytes) -> bytes:
    return fernet.decrypt(data)

def hash_id(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()
