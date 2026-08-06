import cv2
import numpy as np
from skimage.morphology import skeletonize


# ---------------------------
# Grayscale Conversion
# ---------------------------
def convert_to_grayscale(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


# ---------------------------
# Noise Removal
# ---------------------------
def remove_noise(img):
    return cv2.GaussianBlur(img, (5, 5), 0)


# ---------------------------
# Contrast Enhancement
# ---------------------------
def normalize(img):

    # Improve contrast
    img = cv2.equalizeHist(img)

    # Increase contrast and darken ridges
    img = cv2.convertScaleAbs(
        img,
        alpha=1.5,   # contrast
        beta=-30     # brightness
    )

    return img


# ---------------------------
# Binarization
# ---------------------------
def binarize(img):

    binary = cv2.adaptiveThreshold(
        img,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        15,
        5
    )

    return binary


# ---------------------------
# Thinning (Skeletonization)
# ---------------------------
def thinning(img):

    binary = img > 0

    skeleton = skeletonize(binary)

    return (skeleton.astype(np.uint8)) * 255


# ---------------------------
# Minutiae Extraction
# ---------------------------
def extract_features(img):

    if img is None:
        raise ValueError("Invalid image")

    features = []

    height, width = img.shape

    for y in range(1, height - 1):
        for x in range(1, width - 1):

            # Only ridge pixels
            if img[y, x] != 255:
                continue

            neighbours = [
                img[y - 1, x - 1],
                img[y - 1, x],
                img[y - 1, x + 1],
                img[y, x + 1],
                img[y + 1, x + 1],
                img[y + 1, x],
                img[y + 1, x - 1],
                img[y, x - 1]
            ]

            ridge_count = sum(
                1 for pixel in neighbours
                if pixel == 255
            )

            # Ridge Ending
            if ridge_count == 1:
                features.append({
                    "x": int(x),
                    "y": int(y),
                    "type": "ending"
                })

            # Bifurcation
            elif ridge_count == 3:
                features.append({
                    "x": int(x),
                    "y": int(y),
                    "type": "bifurcation"
                })

    return features


# ---------------------------
# BMP → JSON Template
# ---------------------------
def bmp_to_json(image_path):

    img = cv2.imread(image_path)

    if img is None:
        raise ValueError(
            f"Cannot read image: {image_path}"
        )

    gray = convert_to_grayscale(img)

    denoised = remove_noise(gray)

    normalized = normalize(denoised)

    binary = binarize(normalized)

    thin = thinning(binary)

    features = extract_features(thin)

    return features