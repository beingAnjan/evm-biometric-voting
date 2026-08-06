import os
from pymongo import MongoClient
from pymongo.server_api import ServerApi

print("Connecting to MongoDB...")

MONGO_URI = os.environ.get("MONGO_URI")

if not MONGO_URI:
    raise Exception("MONGO_URI not found in environment variables")

client = MongoClient(
    MONGO_URI,
    server_api=ServerApi("1")
)

# Verify the connection
try:
    client.admin.command("ping")
    print("✅ Connected to MongoDB Atlas")
except Exception as e:
    print("❌ MongoDB connection failed:", e)
    raise

db = client["evm_voting_db"]

voters_col = db["voters"]
admins_col = db["admins"]
candidates_col = db["candidates"]
votes_col = db["votes"]

print("Database:", db.name)
print("Collections:", db.list_collection_names())
