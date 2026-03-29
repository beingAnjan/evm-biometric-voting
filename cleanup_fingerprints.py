from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["evm_voting_db"]

fingerprints = db["fingerprints"]
voters = db["voters"]

# Step 1: Get first 200 voters
voter_list = list(voters.find({}, {"voterId": 1}).limit(200))

if len(voter_list) < 200:
    print("❌ Less than 200 voters found. Aborting.")
    exit()

# Step 2: Get all fingerprints sorted by insertion order
fingerprint_list = list(fingerprints.find())

# Step 3: Update first 200 fingerprints
for i in range(200):
    old_fp = fingerprint_list[i]
    new_voter_id = voter_list[i]["voterId"]

    fingerprints.update_one(
        {"_id": old_fp["_id"]},
        {"$set": {"voterId": new_voter_id}}
    )

    print(f"Updated fingerprint {old_fp['voterId']} → {new_voter_id}")

# Step 4: Delete remaining fingerprints
extra_ids = [fp["_id"] for fp in fingerprint_list[200:]]

if extra_ids:
    result = fingerprints.delete_many({"_id": {"$in": extra_ids}})
    print(f"Deleted {result.deleted_count} extra fingerprint records")

print("Fingerprint cleanup completed successfully")
