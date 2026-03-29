import json
from db import voters_col
from fingerprint_match import verify_fingerprint

print("Connecting to MongoDB...")
print("Collections:", voters_col.database.list_collection_names())

# ------------------------------
# Test Voter ID
# ------------------------------
voter_id = "VOTER10002"

# ------------------------------
# Get voter from database
# ------------------------------
voter = voters_col.find_one({"voterId": voter_id})

if not voter:
    print("❌ Voter not found in database")
    exit()

stored_template = voter["fingerprint"]

print("Fingerprint template loaded from DB")

# ------------------------------
# Load fingerprint JSON file
# ------------------------------
json_path = "fingerprint/VOTER10002.json"

with open(json_path) as f:
    scanned_template = json.load(f)

print("Fingerprint template loaded from JSON")

# ------------------------------
# Verify fingerprint
# ------------------------------
result = verify_fingerprint(stored_template, scanned_template)

if result:
    print("Fingerprint Verified ✅")
else:
    print("Fingerprint Not Match ❌")