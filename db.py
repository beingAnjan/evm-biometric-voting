import os
from pymongo import MongoClient
from pymongo.server_api import ServerApi

MONGO_URI = os.environ.get("MONGO_URI")

client = MongoClient(
    MONGO_URI,
    server_api=ServerApi("1")
)

db = client["evm_voting_db"]

voters_col = db["voters"]
admins_col = db["admins"]
candidates_col = db["candidates"]
votes_col = db["votes"]
