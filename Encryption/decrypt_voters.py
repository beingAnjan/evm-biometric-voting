import json
from db import voters_col
from crypto_utils import decrypt_data

for voter in voters_col.find():

    if "encData" not in voter:
        continue

    try:
        decrypted_bytes = decrypt_data(voter["encData"])
        decrypted_json = decrypted_bytes.decode()

        voter_data = json.loads(decrypted_json)

        print("------------")
        print("Name:", voter_data["name"])
        print("Voter ID:", voter_data["voterId"])
        print("Location:", voter_data["location"])
        print("Eligible:", voter_data["isEligible"])
        print("Has Voted:", voter_data["hasVoted"])

    except Exception as e:
        print("Decryption failed:", e)