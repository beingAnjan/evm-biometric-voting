import os
from flask import Flask, request, jsonify, send_from_directory
from datetime import datetime

from db import voters_col, admins_col, candidates_col, votes_col


# Tell Flask to use the "public" folder
app = Flask(
    __name__,
    static_folder="evm_voting_system/public",
    static_url_path=""
)


# ---------------- HOME PAGE ----------------
@app.route("/")
def home():
    return send_from_directory(app.static_folder, "page.html")


# ---------------- LOGIN API ----------------
@app.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    userId = data.get("userId")
    password = data.get("password")

    if not userId or not password:
        return jsonify({"message": "Missing credentials"}), 400

    # ---------- CHECK VOTER ----------
    voter = voters_col.find_one({"voterId": userId})

    if voter:

        if password == voter["password"]:

            # If voter already voted
            if voter.get("hasVoted") is True:
                return jsonify({
                    "alreadyVoted": True,
                    "message": "YOUR VOTE IS ALREADY CASTED"
                }), 200

            return jsonify({
                "message": "Voter login success",
                "role": "voter",
                "name": voter["name"],
                "state": voter["state"],
                "district": voter["district"],
                "constituency": voter["constituency"]
            }), 200

        else:
            return jsonify({"message": "Invalid password"}), 401


    # ---------- CHECK ADMIN ----------
    admin = admins_col.find_one({"adminId": userId})

    if admin:

        if password == admin["password"]:

            return jsonify({
                "message": "Admin login success",
                "role": "admin",
                "name": admin["adminName"]
            }), 200

        else:
            return jsonify({"message": "Invalid password"}), 401

    return jsonify({"message": "User not found"}), 404


# ---------------- GET CANDIDATES ----------------
@app.route("/candidates", methods=["GET"])
def get_candidates():

    state = request.args.get("state")
    district = request.args.get("district")
    constituency = request.args.get("constituency")

    query = {
        "state": state,
        "district": district,
        "constituency": constituency
    }

    candidates = list(candidates_col.find(query, {"_id": 0}))

    return jsonify(candidates)


# ---------------- CAST VOTE ----------------
@app.route("/vote", methods=["POST"])
def cast_vote():

    data = request.get_json()

    voter_name = data.get("voterName")
    candidate_id = data.get("candidateId")

    voter = voters_col.find_one({"name": voter_name})

    if not voter:
        return jsonify({"message": "Voter not found"}), 404

    if voter["hasVoted"]:
        return jsonify({"message": "You have already voted"}), 400

    vote_record = {
        "candidateId": candidate_id,
        "state": voter["state"],
        "district": voter["district"],
        "constituency": voter["constituency"],
        "timestamp": datetime.utcnow().strftime("%d-%m-%Y %H:%M:%S")
    }

    votes_col.insert_one(vote_record)

    voters_col.update_one(
        {"name": voter_name},
        {"$set": {"hasVoted": True}}
    )

    return jsonify({"message": "Vote successfully casted"})

# ---------------- GET RESULTS ----------------
@app.route("/results", methods=["GET"])
def get_results():

    state = request.args.get("state")
    district = request.args.get("district")
    constituency = request.args.get("constituency")

    if not state or not district or not constituency:
        return jsonify({
            "totalVotes": 0,
            "winner": "--",
            "results": []
        })

    query = {
        "state": state,
        "district": district,
        "constituency": constituency
    }

    # ---------------- TOTAL VOTES ----------------
    total_votes = votes_col.count_documents(query)

    # ---------------- COUNT VOTES PER CANDIDATE ----------------
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$candidateId",
            "votes": {"$sum": 1}
        }},
        {"$sort": {"votes": -1}}
    ]

    results = list(votes_col.aggregate(pipeline))

    # ---------------- DETERMINE WINNER ----------------
    winner = "--"

    if len(results) > 0:

        # If more than one candidate and top two have equal votes → Tie
        if len(results) > 1 and results[0]["votes"] == results[1]["votes"]:
            winner = "Tie"

        else:
            winner = results[0]["_id"]

    # ---------------- RESPONSE ----------------
    return jsonify({
        "totalVotes": total_votes,
        "winner": winner,
        "results": results
    })

# ---------------- RUN SERVER ----------------
if __name__ == "__main__":
    import os

    print("Flask server starting...")

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
