from cryptography.fernet import Fernet

key = Fernet.generate_key()

with open("secret_login.key", "wb") as f:
    f.write(key)

print("secret_login.key created")
print(key.decode())
