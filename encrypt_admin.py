import json
from db import admins_col
from crypto_utils import encrypt_data, hash_id
from password_utils import hash_password

for admin in admins_col.find():
    if "encData" in admin:
        print("⏩ Skipping already encrypted admin")
        continue

    admin_id = admin["adminId"]

    private_data = {
        "adminName": admin["adminName"],
        "adminId": admin_id,
        "location": admin["location"]
    }

    admins_col.update_one(
        {"_id": admin["_id"]},
        {
            "$set": {
                "adminIdHash": hash_id(admin_id),
                "passwordHash": hash_password(admin["password"]),
                "encData": encrypt_data(json.dumps(private_data).encode())
            },
            "$unset": {
                "password": "",
                "adminName": "",
                "location": ""
            }
        }
    )

    print(f"Encrypted admin {admin_id}")
