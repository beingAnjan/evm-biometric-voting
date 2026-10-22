from flask import Flask, request, jsonify, send_file, send_from_directory, session
from datetime import datetime, timezone

from db import voters_col, admins_col, candidates_col, votes_col, elections_col
from fingerprint_pipeline import bmp_to_json
from fingerprint_matcher import match_fingerprints
import os

# Tell Flask to use the "public" folder
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or os.urandom(32)

PUBLIC_DIR = os.path.join(app.root_path, "evm_voting_system", "public")


def election_status():
    """Return the configured election and whether its voting window is open."""
    settings = elections_col.find_one({"_id": "current"})
    if not settings:
        return {"configured": False, "isOpen": False, "status": "not_configured"}

    now = datetime.now(timezone.utc)
    start_at = datetime.fromisoformat(settings["startAt"])
    end_at = datetime.fromisoformat(settings["endAt"])
    enabled = settings.get("enabled", False)

    if not enabled or now > end_at:
        status = "closed"
    elif now < start_at:
        status = "scheduled"
    else:
        status = "open"

    return {
        "configured": True,
        "title": settings.get("title", "Election"),
        "startAt": settings["startAt"],
        "endAt": settings["endAt"],
        "enabled": enabled,
        "isOpen": status == "open",
        "status": status,
    }

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

@app.route("/<path:filename>")
def public_files(filename):
    return send_from_directory(PUBLIC_DIR, filename)

@app.route("/test-db")
def test_db():
    try:
        # Test MongoDB connection
        from db import client

        client.admin.command("ping")

        return jsonify({
            "success": True,
            "message": "MongoDB connection successful"
        })

    except Exception as e:
        print("MongoDB ERROR:", repr(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ---------------- LOGIN API ----------------
@app.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    if not isinstance(data, dict):
        return jsonify({"message": "Invalid request"}), 400

    session.clear()

    userId = data.get("userId")
    password = data.get("password")

    if not userId or not password:
        return jsonify({"message": "Missing credentials"}), 400

    # ---------- CHECK VOTER ----------
    voter = voters_col.find_one({"voterId": userId})

    if voter:

        if password == voter["password"]:

            status = election_status()
            if not status.get("isOpen"):
                messages = {
                    "not_configured": "Voting is not available yet.",
                    "scheduled": "Voting has not started yet.",
                    "closed": "Voting is currently closed.",
                }
                return jsonify({
                    "message": messages.get(status.get("status"), "Voting is not currently available.")
                }), 403

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

            session["role"] = "admin"
            session["adminId"] = userId

            return jsonify({
                "message": "Admin login success",
                "role": "admin",
                "name": admin["adminName"]
            }), 200

        else:
            return jsonify({"message": "Invalid password"}), 401

    return jsonify({"message": "User not found"}), 404


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@app.route("/election-status", methods=["GET"])
def get_election_status():
    return jsonify(election_status())


@app.route("/admin/election", methods=["GET", "PUT"])
def manage_election():
    if session.get("role") != "admin":
        return jsonify({"message": "Admin login required"}), 401

    if request.method == "GET":
        settings = elections_col.find_one({"_id": "current"})
        return jsonify(settings or {"configured": False, "enabled": False})

    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({"message": "Invalid request"}), 400

    title = str(data.get("title", "")).strip()
    start_at = data.get("startAt")
    end_at = data.get("endAt")
    enabled = data.get("enabled")

    if not title or len(title) > 100:
        return jsonify({"message": "Enter an election name (up to 100 characters)."}), 400
    if not isinstance(start_at, str) or not isinstance(end_at, str) or not isinstance(enabled, bool):
        return jsonify({"message": "Enter valid start and end dates."}), 400

    try:
        start_dt = datetime.fromisoformat(start_at.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end_at.replace("Z", "+00:00"))
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=timezone.utc)
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=timezone.utc)
        start_dt = start_dt.astimezone(timezone.utc)
        end_dt = end_dt.astimezone(timezone.utc)
    except ValueError:
        return jsonify({"message": "Enter valid start and end dates."}), 400

    if end_dt <= start_dt:
        return jsonify({"message": "The end date must be after the start date."}), 400

    elections_col.update_one(
        {"_id": "current"},
        {"$set": {
            "title": title,
            "startAt": start_dt.isoformat(),
            "endAt": end_dt.isoformat(),
            "enabled": enabled,
        }},
        upsert=True,
    )
    return jsonify(election_status())


@app.route("/admin/dashboard", methods=["GET"])
def get_admin_dashboard():
    if session.get("role") != "admin":
        return jsonify({"message": "Admin login required"}), 401

    total_votes = votes_col.count_documents({})
    total_voters = voters_col.count_documents({})
    turnout = round((total_votes / total_voters) * 100, 1) if total_voters else 0

    leading_candidate = list(votes_col.aggregate([
        {"$group": {"_id": "$candidateId", "votes": {"$sum": 1}}},
        {"$sort": {"votes": -1, "_id": 1}},
        {"$limit": 1},
    ]))

    return jsonify({
        "totalVotes": total_votes,
        "turnout": turnout,
        "leadingCandidate": leading_candidate[0]["_id"] if leading_candidate else "--",
    })


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

    if not election_status().get("isOpen"):
        return jsonify({"message": "Voting is currently closed."}), 403

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
