from pymongo import MongoClient
import os

client = MongoClient("mongodb://localhost:27017/")
db = client["evm_voting_db"]
collection = db["fingerprints"]

encrypted_folder = "encrypted_templates"

for file in os.listdir(encrypted_folder):
    if not file.endswith(".bin"):
        continue

    voter_id = file.replace(".bin", "")   # example: 0 (1)

    with open(os.path.join(encrypted_folder, file), "rb") as f:
        encrypted_data = f.read()

    doc = {
        "voterId": voter_id,
        "fingerprintTemplate": encrypted_data
    }

    collection.insert_one(doc)
    print(f"Stored fingerprint for {voter_id}")

print("All encrypted templates stored in MongoDB")
