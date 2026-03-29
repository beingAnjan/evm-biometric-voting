from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["evm_voting_db"]

fingerprints = db["fingerprints"]

# MAP OLD IDS → REAL VOTER IDS
id_map = {
    "0 (1)": "SKM1001",
    "0 (2)": "SKM1002",
    "0 (3)": "SKM1003"
    # add more mappings
}

for old_id, new_id in id_map.items():
    result = fingerprints.update_one(
        {"voterId": old_id},
        {"$set": {"voterId": new_id}}
    )

    if result.modified_count > 0:
        print(f"Updated {old_id} → {new_id}")
    else:
        print(f"No record found for {old_id}")

print("Fingerprint voterId correction completed")
