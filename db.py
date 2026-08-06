import os
from pymongo import MongoClient

print("Connecting to MongoDB...")

MONGO_URI = os.environ.get("MONGO_URI")

if not MONGO_URI:
    raise Exception("MONGO_URI not found in environment variables")

client = MongoClient(MONGO_URI)

db = client["evm_voting_db"]

voters_col = db["voters"]
admins_col = db["admins"]
candidates_col = db["candidates"]
votes_col = db["votes"]

print("Collections:", db.list_collection_names())
