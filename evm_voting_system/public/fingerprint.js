document.addEventListener("DOMContentLoaded", function () {
    if (localStorage.getItem("voterLoggedIn") !== "true") {
        window.location.replace("page.html");
        return;
    }

    if (!localStorage.getItem("pendingCandidate")) {
        window.location.replace("voterPanel.html");
        return;
    }

    const form = document.getElementById("fingerprintForm");
    const fileInput = document.getElementById("fingerprintInput");
    const browseButton = document.getElementById("browseButton");
    const removeButton = document.getElementById("removeFileButton");
    const verifyButton = document.getElementById("verifyButton");
    const uploadArea = document.getElementById("uploadArea");
    const imagePreview = document.getElementById("imagePreview");

    browseButton.addEventListener("click", function () {
        fileInput.click();
    });

    fileInput.addEventListener("change", function () {
        showSelectedFile(fileInput.files[0]);
    });

    removeButton.addEventListener("click", function () {
        fileInput.value = "";
        imagePreview.removeAttribute("src");
        imagePreview.hidden = true;
        removeButton.hidden = true;
        uploadArea.classList.remove("has-file");
        document.getElementById("fileTitle").textContent = "Choose a fingerprint image";
        document.getElementById("fileHint").textContent = "PNG, JPG, JPEG, or BMP · up to 2 MB";
        verifyButton.disabled = true;
        setStatus("", "");
    });

    form.addEventListener("submit", verifyFingerprint);
});

function showSelectedFile(file) {
    const fileInput = document.getElementById("fingerprintInput");
    const fileTitle = document.getElementById("fileTitle");
    const fileHint = document.getElementById("fileHint");
    const preview = document.getElementById("imagePreview");
    const area = document.getElementById("uploadArea");
    const removeButton = document.getElementById("removeFileButton");
    const verifyButton = document.getElementById("verifyButton");

    setStatus("", "");
    if (!file) {
        verifyButton.disabled = true;
        return;
    }

    const extension = file.name.toLowerCase().split(".").pop();
    const allowed = ["png", "jpg", "jpeg", "bmp"];
    if (!allowed.includes(extension)) {
        fileInput.value = "";
        verifyButton.disabled = true;
        setStatus("Choose a PNG, JPG, JPEG, or BMP image.", "error");
        return;
    }
    if (file.size === 0) {
        fileInput.value = "";
        verifyButton.disabled = true;
        setStatus("The selected image is empty. Choose another file.", "error");
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        fileInput.value = "";
        verifyButton.disabled = true;
        setStatus("The image must be 2 MB or smaller.", "error");
        return;
    }

    fileTitle.textContent = file.name;
    fileHint.textContent = formatFileSize(file.size);
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    removeButton.hidden = false;
    area.classList.add("has-file");
    verifyButton.disabled = false;
}

function formatFileSize(size) {
    return size < 1024 * 1024
        ? Math.max(1, Math.round(size / 1024)) + " KB"
        : (size / (1024 * 1024)).toFixed(1) + " MB";
}

async function verifyFingerprint(event) {
    event.preventDefault();

    const fileInput = document.getElementById("fingerprintInput");
    const file = fileInput.files[0];
    const button = document.getElementById("verifyButton");
    const buttonText = document.getElementById("verifyButtonText");

    if (!file) {
        setStatus("Choose a fingerprint image first.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("fingerprint", file);

    button.disabled = true;
    buttonText.textContent = "Checking image…";
    setStatus("Checking your fingerprint image. Please wait.", "loading");

    try {
        const response = await fetch("/verify-fingerprint", {
            method: "POST",
            body: formData
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
            setStatus(result.message || "We couldn’t verify this image. Please try again.", "error");
            return;
        }

        const voterName = localStorage.getItem("voterName");
        const candidateId = localStorage.getItem("pendingCandidate");
        if (!voterName || !candidateId) {
            setStatus("Your ballot session has expired. Please sign in again.", "error");
            window.setTimeout(function () { window.location.replace("page.html"); }, 1200);
            return;
        }

        setStatus("Fingerprint verified. Recording your vote…", "loading");
        const voteResponse = await fetch("/vote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voterName: voterName, candidateId: candidateId })
        });
        const voteResult = await voteResponse.json();

        if (!voteResponse.ok) {
            setStatus(voteResult.message || "Your vote could not be recorded. Please try again.", "error");
            return;
        }

        [
            "voterLoggedIn", "voterName", "state", "district", "constituency",
            "voterId", "fingerVerified", "pendingCandidate"
        ].forEach(function (key) {
            localStorage.removeItem(key);
        });
        setStatus("Your vote has been recorded. Returning to sign in…", "success");
        window.location.replace("page.html");
        return;
    } catch (error) {
        setStatus("Could not connect to the server. Check your connection and try again.", "error");
    } finally {
        if (buttonText.textContent !== "Verified") {
            button.disabled = false;
            buttonText.textContent = "Verify fingerprint";
        }
    }
}

function setStatus(message, state) {
    const status = document.getElementById("statusMessage");
    status.textContent = message;
    status.className = "status-message" + (state ? " " + state : "");
}
