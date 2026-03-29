import json
from crypto_utils import decrypt_data

def decrypt_admin(admin_document):
    # Step 1: Get encrypted data
    encrypted_blob = admin_document["encData"]

    # Step 2: Decrypt (returns bytes)
    decrypted_bytes = decrypt_data(encrypted_blob)

    # Step 3: Convert bytes → string
    decrypted_string = decrypted_bytes.decode()

    # Step 4: Convert JSON string → dictionary
    decrypted_data = json.loads(decrypted_string)

    return decrypted_data
