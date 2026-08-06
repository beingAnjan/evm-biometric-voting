def match_fingerprints(template, scanned, tolerance=8):

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