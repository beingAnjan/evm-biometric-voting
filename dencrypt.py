from cryptography.fernet import Fernet

# Load AES key
with open("secret.key", "rb") as f:
    key = f.read()

cipher = Fernet(key)

# Load encrypted template
with open("encrypted_templates/0 (1).bin", "rb") as f:
    encrypted_data = f.read()

# Decrypt
decrypted_data = cipher.decrypt(encrypted_data)

print("Decrypted template:")
print(decrypted_data.decode())
