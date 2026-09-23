from flask import Flask, request, jsonify, send_file, send_from_directory
from datetime import datetime

from db import voters_col, admins_col, candidates_col, votes_col
from fingerprint_pipeline import bmp_to_json
from fingerprint_matcher import match_fingerprints
import os

# Tell Flask to use the "public" folder
app = Flask(__name__)

PUBLIC_DIR = os.path.join(app.root_path, "evm_voting_system", "public")

# ---------------- HOME PAGE ----------------
@app.route("/")
def home():
    page_path = os.path.join(
        app.root_path,
        "evm_voting_system",
        "public",
        "page.html"
    )

    print("Looking for page at:", page_path)
    print("File exists:", os.path.exists(page_path))

    return send_file(page_path)
    
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

@app.route("/verify-fingerprint", methods=["POST"])
def verify_fingerprint():

    file = request.files.get("fingerprint")
    voter_id = request.form.get("voterId")

    if not file or not voter_id:
        return jsonify({
            "success": False,
            "message": "Missing data"
        })

    # -------------------------------
    # Check file extension
    # -------------------------------
    extension = file.filename.lower().split(".")[-1]

    allowed = ["png", "jpg", "jpeg", "bmp"]

    if extension not in allowed:
        return jsonify({
            "success": False,
            "message": "Only png, jpg, jpeg and bmp files are allowed"
        })

    # -------------------------------
    # Find voter
    # -------------------------------
    voter = voters_col.find_one({
        "voterId": voter_id
    })

    if not voter:
        return jsonify({
            "success": False,
            "message": "Voter not found"
        })

    # -------------------------------
    # Get stored fingerprint template
    # -------------------------------
    stored_template = voter.get("fingerprint")

    if not stored_template:
        return jsonify({
            "success": False,
            "message": "Fingerprint template not found"
        })

    # -------------------------------
    # Save uploaded image temporarily
    # -------------------------------
    upload_path = f"temp_fingerprint.{extension}"
    file.save(upload_path)

    try:
        # Extract minutiae from uploaded image
        uploaded_template = bmp_to_json(upload_path)

    except Exception as e:

        if os.path.exists(upload_path):
            os.remove(upload_path)

        print("Fingerprint processing error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to process fingerprint image"
        })

    # Remove temporary file
    if os.path.exists(upload_path):
        os.remove(upload_path)

    # -------------------------------
    # Debug prints
    # -------------------------------
    print("Voter ID:", voter_id)
    print("Stored minutiae:", len(stored_template))
    print("Uploaded minutiae:", len(uploaded_template))

    print(
        "Stored endings:",
        sum(
            1
            for p in stored_template
            if p["type"] == "ending"
        )
    )

    print(
        "Stored bifurcations:",
        sum(
            1
            for p in stored_template
            if p["type"] == "bifurcation"
        )
    )

    print(
        "Uploaded endings:",
        sum(
            1
            for p in uploaded_template
            if p["type"] == "ending"
        )
    )

    print(
        "Uploaded bifurcations:",
        sum(
            1
            for p in uploaded_template
            if p["type"] == "bifurcation"
        )
    )

    # -------------------------------
    # Match fingerprints
    # -------------------------------
    score = match_fingerprints(
        stored_template,
        uploaded_template,
        tolerance=8
    )

    score = round(score * 100, 2)

    print("Fingerprint Score:", score, "%")

    # -------------------------------
    # Threshold
    # -------------------------------
    THRESHOLD = 99

    if score < THRESHOLD:
        return jsonify({
            "success": False,
            "message":
                f"Fingerprint does not match this voter "
                f"(Score: {score}%)"
        })

    # -------------------------------
    # Check vote status
    # -------------------------------
    if voter.get("hasVoted"):
        return jsonify({
            "success": False,
            "message": "YOUR VOTE IS ALREADY CASTED"
        })

    # -------------------------------
    # Success
    # -------------------------------
    return jsonify({
        "success": True,
        "message": "Fingerprint verified successfully",
        "score": score,
        "voterId": voter_id
    })

# ---------------- RUN SERVER ----------------
if __name__ == "__main__":
    print("Flask server starting...")
    app.run(debug=True, use_reloader=False)
