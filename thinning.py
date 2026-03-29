import cv2
import os
import numpy as np
from skimage.morphology import skeletonize

input_folder = "binarization"
output_folder = "thinning"

os.makedirs(output_folder, exist_ok=True)

for i in range(1, 400):
    filename = f"0 ({i}).bmp"
    input_path = os.path.join(input_folder, filename)
    output_path = os.path.join(output_folder, filename)

    img = cv2.imread(input_path, cv2.IMREAD_GRAYSCALE)

    if img is None:
        print(f"[!] Missing: {filename}")
        continue

    # Convert to binary boolean image
    binary = img == 0   # ridges are black (0)

    # Skeletonization
    skeleton = skeletonize(binary)

    # Convert back to image format
    skeleton_img = (skeleton == 0).astype("uint8") * 255

    cv2.imwrite(output_path, skeleton_img)
    print(f"[✓] Thinned: {filename}")

print("Thinning completed.")
