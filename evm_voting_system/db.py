from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["evm_system"]

voters_col = db["voters"]
admins_col = db["admins"]
