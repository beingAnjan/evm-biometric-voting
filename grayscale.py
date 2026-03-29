import cv2
import os

folder_path = "fingerprints"

for i in range(1, 400):
    filename = f"0 ({i}).bmp"
    filepath = os.path.join(folder_path, filename)

    img = cv2.imread(filepath)

    if img is None:
        print(f"[!] Skipping missing file: {filename}")
        continue

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cv2.imwrite(filepath, gray)

    print(f"[✓] Converted: {filename}")

print("All images converted to grayscale successfully.")
