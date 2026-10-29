import os
from flask import has_request_context, session
from pymongo import MongoClient
from pymongo.server_api import ServerApi

MONGO_URI = os.environ.get("MONGO_URI")

client = MongoClient(
    MONGO_URI,
    server_api=ServerApi("1")
)

db = client["evm_voting_db"]
demo_db = client["evm_voting_demo_db"]

_live_collections = {
    "voters": db["voters"],
    "admins": db["admins"],
    "candidates": db["candidates"],
    "votes": db["votes"],
    "elections": db["elections"],
}
_demo_collections = {
    "voters": demo_db["voters"],
    "admins": demo_db["admins"],
    "candidates": demo_db["candidates"],
    "votes": demo_db["votes"],
    "elections": demo_db["elections"],
}


class SessionCollection:
    """Route requests with a demo session to a separate, synthetic demo database."""

    def __init__(self, name):
        self.name = name

    def __getattr__(self, operation):
        in_demo = (
            has_request_context()
            and session.get("demo_mode") is True
        )
        collection = _demo_collections[self.name] if in_demo else _live_collections[self.name]
        return getattr(collection, operation)


voters_col = SessionCollection("voters")
admins_col = SessionCollection("admins")
candidates_col = SessionCollection("candidates")
votes_col = SessionCollection("votes")
elections_col = SessionCollection("elections")


def demo_mode_enabled():
    return os.environ.get("ENABLE_DEMO_MODE", "").strip().lower() == "true"


def ensure_demo_data():
    """Create a small fictional dataset only in evm_voting_demo_db."""
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    demo_voters = _demo_collections["voters"]
    demo_candidates = _demo_collections["candidates"]
    demo_elections = _demo_collections["elections"]

    demo_voters.update_one(
        {"voterId": "DEMO-VOTER"},
        {"$setOnInsert": {
            "voterId": "DEMO-VOTER",
            "name": "Sample Voter",
            "state": "Andhra Pradesh",
            "district": "YSR Kadapa",
            "constituency": "Kadapa",
            "hasVoted": False,
        }},
        upsert=True,
    )

    for candidate in (
        {
            "candidateId": "DEMO-CANDIDATE-1",
            "name": "Sample Candidate One",
            "party": "Demo Party A",
            "state": "Andhra Pradesh",
            "district": "YSR Kadapa",
            "constituency": "Kadapa",
        },
        {
            "candidateId": "DEMO-CANDIDATE-2",
            "name": "Sample Candidate Two",
            "party": "Demo Party B",
            "state": "Andhra Pradesh",
            "district": "YSR Kadapa",
            "constituency": "Kadapa",
        },
    ):
        demo_candidates.update_one(
            {"candidateId": candidate["candidateId"]},
            {"$setOnInsert": candidate},
            upsert=True,
        )

    demo_elections.update_one(
        {"_id": "current"},
        {"$setOnInsert": {
            "title": "SecureVote Demo Election",
            "startAt": (now - timedelta(minutes=5)).isoformat(),
            "endAt": (now + timedelta(days=3650)).isoformat(),
            "enabled": True,
        }},
        upsert=True,
    )
