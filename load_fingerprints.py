import os
import json
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")

db = client["evm_voting_db"]   # correct database

voters_col = db["voters"]

folder = "fingerprint"

files = os.listdir(folder)

for file in files:

    if file.endswith(".json"):

        voter_id = file.replace(".json", "")
        path = os.path.join(folder, file)

        try:
            with open(path) as f:
                fingerprint_data = json.load(f)

            voters_col.update_one(
                {"voterId": voter_id},
                {"$set": {"fingerprint": fingerprint_data}}
            )

            print("Inserted fingerprint for", voter_id)

        except Exception as e:
            print("Skipping bad file:", file)

print("Import completed")