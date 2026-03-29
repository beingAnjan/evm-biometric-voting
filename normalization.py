import cv2
import os

input_folder = "noise_removal"
output_folder = "normalization"

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

    # Normalize image to range 0–255
    normalized = cv2.normalize(
        img, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX
    )

    # Save normalized image
    cv2.imwrite(output_path, normalized)

    print(f"[✓] Normalized: {filename}")

print("Normalization completed successfully.")
