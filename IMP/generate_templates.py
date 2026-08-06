import os
import json
from fingerprint_pipeline import bmp_to_json

FINGERPRINT_DIR = "fingerprints"
TEMPLATE_DIR = "templates"

os.makedirs(TEMPLATE_DIR, exist_ok=True)

for filename in os.listdir(FINGERPRINT_DIR):

    if not filename.lower().endswith(".bmp"):
        continue

    voter_id = os.path.splitext(filename)[0]

    image_path = os.path.join(
        FINGERPRINT_DIR,
        filename
    )

    print("Processing:", filename)

    try:
        features = bmp_to_json(image_path)

        json_path = os.path.join(
            TEMPLATE_DIR,
            voter_id + ".json"
        )

        with open(json_path, "w") as f:
            json.dump(
                features,
                f,
                indent=4
            )

        print("Saved:", voter_id + ".json")

    except Exception as e:
        print("Error:", filename)
        print(e)

print("All templates generated.")