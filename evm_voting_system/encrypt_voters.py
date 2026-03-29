import json
from db import voters_col
from crypto_utils import encrypt_data, hash_id
from password_utils import hash_password

for voter in voters_col.find({"password": {"$exists": True}}):
    voterId = voter["voterId"]

    private_data = {
        "name": voter["name"],
        "voterId": voterId,
        "location": voter["location"],
        "isEligible": voter["isEligible"],
        "hasVoted": voter["hasVoted"]
    }

    encrypted_blob = encrypt_data(json.dumps(private_data).encode())

    voters_col.update_one(
        {"_id": voter["_id"]},
        {
            "$set": {
                "voterIdHash": hash_id(voterId),
                "encData": encrypted_blob,
                "passwordHash": hash_password(voter["password"])
            },
            "$unset": {
                "password": "",
                "name": "",
                "voterId": "",
                "location": "",
                "isEligible": "",
                "hasVoted": ""
            }
        }
    )

    print(f"Encrypted voter {voterId}")