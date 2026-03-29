from pymongo import MongoClient

print("Connecting to MongoDB...")

client = MongoClient("mongodb://localhost:27017/")

db = client["evm_voting_db"]

voters_col = db["voters"]
admins_col = db["admins"]
candidates_col = db["candidates"]
votes_col = db["votes"]

print("Collections:", db.list_collection_names())