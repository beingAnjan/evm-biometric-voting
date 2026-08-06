import os
from pymongo import MongoClient
from pymongo.server_api import ServerApi

print("Connecting to MongoDB...")

MONGO_URI = os.environ.get("MONGO_URI")

if not MONGO_URI:
    raise Exception("MONGO_URI not found in environment variables")

client = MongoClient(
    MONGO_URI,
    server_api=ServerApi('1')
)

db = client["evm_voting_db"]

voters_col = db["voters"]
admins_col = db["admins"]
candidates_col = db["candidates"]
votes_col = db["votes"]

# Comment this out for now
# print("Collections:", db.list_collection_names())
