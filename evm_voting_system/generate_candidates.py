import json
import random
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["evm_voting_db"]

candidates_col = db["candidates"]

# clear old candidates
candidates_col.delete_many({})

# load election data
with open("india_election_data.json","r",encoding="utf-8") as f:
    states = json.load(f)["states"]

candidate_names = [
"Ravi Kumar","Amit Sharma","Priya Reddy","Arjun Patel",
"Neha Singh","Kiran Rao","Rahul Verma","Sneha Gupta",
"Vikas Yadav","Anjali Nair"
]

parties = [
{"name":"Progressive Party","symbol":"🟦"},
{"name":"Democratic Alliance","symbol":"🟩"},
{"name":"Unity Front","symbol":"🟧"},
{"name":"People's Party","symbol":"🟪"},
{"name":"National Congress","symbol":"🟥"}
]

candidate_id = 1000

candidates = []

for state in states:

    for district in state["districts"]:

        for constituency in district["constituencies"]:

            selected_parties = random.sample(parties,4)

            for party in selected_parties:

                candidate_id += 1

                candidate = {

                    "candidateId": f"C{candidate_id}",
                    "name": random.choice(candidate_names),
                    "party": party["name"],
                    "partySymbol": party["symbol"],

                    "state": state["state"],
                    "district": district["district"],
                    "constituency": constituency
                }

                candidates.append(candidate)

candidates_col.insert_many(candidates)

print("✅ Candidates generated successfully")