import cv2
import os

# Input and output folders (RELATIVE paths)
input_folder = "fingerprints"
output_folder = "noise_removal"

# Create output folder if it doesn't exist
os.makedirs(output_folder, exist_ok=True)

for i in range(1, 400):
    filename = f"0 ({i}).bmp"

    input_path = os.path.join(input_folder, filename)
    output_path = os.path.join(output_folder, filename)

    # Read grayscale image
    img = cv2.imread(input_path, cv2.IMREAD_GRAYSCALE)

    if img is None:
        print(f"[!] Could not read: {input_path}")
        continue

    # Gaussian Blur for noise removal
    denoised = cv2.GaussianBlur(img, (5, 5), 0)

    # Save denoised image
    cv2.imwrite(output_path, denoised)

    print(f"[✓] Noise removed: {filename}")

print("Noise removal completed successfully.")
