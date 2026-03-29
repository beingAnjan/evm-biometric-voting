from cryptography.fernet import Fernet
import json
import os

# Load encryption key
with open("secret.key", "rb") as f:
    key = f.read()

cipher = Fernet(key)

input_folder = "templates"
output_folder = "encrypted_templates"
os.makedirs(output_folder, exist_ok=True)

for i in range(1, 400):
    filename = f"0 ({i}).json"
    input_path = os.path.join(input_folder, filename)

    if not os.path.exists(input_path):
        continue

    # Read template
    with open(input_path, "r") as f:
        template_data = f.read()

    # Encrypt template
    encrypted_data = cipher.encrypt(template_data.encode())

    # Save encrypted template
    output_path = os.path.join(output_folder, f"0 ({i}).bin")
    with open(output_path, "wb") as f:
        f.write(encrypted_data)

    print(f"[✓] Encrypted template: 0 ({i})")

print("🎉 Template encryption completed.")
