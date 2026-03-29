def match_fingerprints(template, scanned, tolerance=5):

    match_count = 0

    for t in template:
        for s in scanned:

            if (
                abs(t["x"] - s["x"]) <= tolerance and
                abs(t["y"] - s["y"]) <= tolerance and
                t["type"] == s["type"]
            ):
                match_count += 1
                break

    if len(template) == 0:
        return 0

    similarity = match_count / len(template)

    return similarity


def verify_fingerprint(stored_template, scanned_template):

    score = match_fingerprints(stored_template, scanned_template)

    print("Fingerprint match score:", score)

    if score > 0.6:
        return True
    else:
        return False