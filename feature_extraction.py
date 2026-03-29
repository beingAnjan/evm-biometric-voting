import cv2

def extract_features(image_path):

    img = cv2.imread(image_path, 0)

    if img is None:
        raise ValueError("Image not found")

    # simple example feature extraction
    features = []

    for y in range(img.shape[0]):
        for x in range(img.shape[1]):

            if img[y][x] == 255:   # ridge pixel
                features.append({
                    "x": int(x),
                    "y": int(y),
                    "type": "ending"
                })

    return features