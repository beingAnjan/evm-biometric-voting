from pymongo import MongoClient
import json
import random

client = MongoClient("mongodb://localhost:27017/")

db = client["evm_voting_db"]
voters_col = db["voters"]

# Load election data
with open("india_election_data.json","r",encoding="utf-8") as f:
    election_data = json.load(f)["states"]

# Load names
with open("names.txt","r",encoding="utf-8") as f:
    names = [n.strip() for n in f.readlines()]

genders = ["Male","Female"]

voters = []

for i in range(20000):

    state = random.choice(election_data)
    district = random.choice(state["districts"])
    constituency = random.choice(district["constituencies"])

    voter = {

        "voterId": f"VOTER{i+10000}",
        "password": "vote123",

        "name": random.choice(names),
        "age": random.randint(18,70),
        "gender": random.choice(genders),

        "state": state["state"],
        "district": district["district"],
        "constituency": constituency,

        "city": district["district"],

        "hasVoted": False
    }

    voters.append(voter)

voters_col.insert_many(voters)

print("✅ 20000 voters inserted successfully")