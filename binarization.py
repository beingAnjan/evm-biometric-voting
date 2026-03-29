import cv2
import os

input_folder = "normalization"
output_folder = "binarization"

# Create output folder if it doesn't exist
os.makedirs(output_folder, exist_ok=True)

for i in range(1, 400):
    filename = f"0 ({i}).bmp"
    input_path = os.path.join(input_folder, filename)
    output_path = os.path.join(output_folder, filename)

    img = cv2.imread(input_path, cv2.IMREAD_GRAYSCALE)

    if img is None:
        print(f"[!] Could not read: {input_path}")
        continue

    # Adaptive Thresholding for fingerprint binarization
    binary = cv2.adaptiveThreshold(
        img,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11,
        2
    )

    cv2.imwrite(output_path, binary)
    print(f"[✓] Binarized: {filename}")

print("Binarization completed successfully.")
