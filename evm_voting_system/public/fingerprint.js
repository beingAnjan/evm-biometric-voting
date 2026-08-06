// 🔐 Block direct access
if (localStorage.getItem("voterLoggedIn") !== "true") {
    window.location.href = "page.html";
}

async function uploadFingerprint() {

    const fileInput = document.getElementById("fingerprintInput");
    const status = document.getElementById("status");

    // ❌ No file selected
    if (!fileInput.files.length) {
        status.innerText = "❌ Please select a file";
        return;
    }

    const file = fileInput.files[0];

    // ✅ Allowed extensions
    const allowedExtensions = ["jpeg", "jpg", "png", "bmp", "json"];

    // ✅ Allowed MIME types
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/bmp",
        "application/json"
    ];

    const fileName = file.name.toLowerCase();
    const extension = fileName.split(".").pop();

    // 🔐 Extension validation
    if (!allowedExtensions.includes(extension)) {
        status.innerText = "❌ Only jpeg, jpg, png, bmp, json files are allowed!";
        return;
    }

    // 🔐 MIME validation (skip strict check for JSON)
    if (extension !== "json" && !allowedTypes.includes(file.type)) {
        status.innerText = "❌ Invalid file type!";
        return;
    }

    // 🔐 File size check (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        status.innerText = "❌ File size must be less than 2MB!";
        return;
    }

    // 🔐 Get voterId
    const voterId = localStorage.getItem("voterId");

    if (!voterId) {
        status.innerText = "❌ Session expired. Please login again.";
        window.location.href = "page.html";
        return;
    }

    // 📦 Prepare form data
    let formData = new FormData();
    formData.append("fingerprint", file);
    formData.append("voterId", voterId);

    try {

        status.innerText = "⏳ Verifying fingerprint...";

        const response = await fetch("/verify-fingerprint", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (result.success) {

            status.innerText = "✅ Fingerprint Verified";

            // 🔐 Mark verified
            localStorage.setItem("fingerVerified", "true");

            setTimeout(() => {
                window.location.href = "voterPanel.html";
            }, 1500);

        } else {
            status.innerText = "❌ " + result.message;
        }

    } catch (error) {
        console.error(error);
        status.innerText = "❌ Server error";
    }
}