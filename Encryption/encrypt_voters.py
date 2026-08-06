import json
from db import voters_col
from crypto_utils import encrypt_data, hash_id
from password_utils import hash_password

for voter in voters_col.find():
    # Skip already encrypted voters
    if "encData" in voter:
        print("⏩ Skipping already encrypted voter")
        continue

    voter_id = voter["voterId"]

    private_data = {
        "name": voter["name"],
        "voterId": voter_id,
        "location": voter["location"],
        "isEligible": voter["isEligible"],
        "hasVoted": voter["hasVoted"]
    }

    voters_col.update_one(
        {"_id": voter["_id"]},
        {
            "$set": {
                "voterIdHash": hash_id(voter_id),
                "encData": encrypt_data(json.dumps(private_data).encode()),
                "passwordHash": hash_password(voter["password"])
            },
            "$unset": {
                "password": "",
                "name": "",
                "location": "",
                "isEligible": "",
                "hasVoted": ""
                # voterId will be removed AFTER index fix
            }
        }
    )

    print(f"Encrypted voter {voter_id}")
