let selectedCandidate = null;

document.addEventListener("DOMContentLoaded", function () {

    // 🔐 Prevent direct access without login
    if (localStorage.getItem("voterLoggedIn") !== "true") {
        window.location.replace("page.html");
        return;
    }

    const voterName = localStorage.getItem("voterName");
    const state = localStorage.getItem("state");
    const district = localStorage.getItem("district");
    const constituency = localStorage.getItem("constituency");

    // 👤 Show logged in user
    if (voterName) {
        document.getElementById("voterName").innerText =
            "Logged in as " + voterName;
    }

    // 🚪 Logout button
    document.getElementById("logoutBtn").addEventListener("click", function () {

        localStorage.removeItem("voterLoggedIn");
        localStorage.removeItem("voterName");
        localStorage.removeItem("state");
        localStorage.removeItem("district");
        localStorage.removeItem("constituency");

        window.location.replace("page.html");
    });

    // 🗳️ Vote button
    document.getElementById("voteBtn").addEventListener("click", function () {

        if (!selectedCandidate) {
            alert("Please select a candidate before voting.");
            return;
        }

        // 🔐 Check fingerprint verification
        if (localStorage.getItem("fingerVerified") !== "true") {

            // Save selected candidate
            localStorage.setItem("pendingCandidate", selectedCandidate);

            // Go to fingerprint page
            window.location.href = "fingerprint.html";
            return;
        }

        // ✅ Already verified → submit vote
        submitVote();
    });

    // 📥 Load candidates
    loadCandidates(state, district, constituency);

    // 🔁 AUTO SUBMIT after fingerprint verification
    if (
        localStorage.getItem("fingerVerified") === "true" &&
        localStorage.getItem("pendingCandidate")
    ) {
        submitVote();
    }

});


// 🧠 Submit vote function
async function submitVote() {

    const voterName = localStorage.getItem("voterName");
    const candidateId =
        localStorage.getItem("pendingCandidate") || selectedCandidate;

    try {

        const response = await fetch("/vote", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                voterName: voterName,
                candidateId: candidateId
            })
        });

        const data = await response.json();

        if (response.ok) {

            alert("✅ Your vote has been recorded");

            // 🔥 Clear everything
            localStorage.removeItem("voterLoggedIn");
            localStorage.removeItem("voterName");
            localStorage.removeItem("state");
            localStorage.removeItem("district");
            localStorage.removeItem("constituency");
            localStorage.removeItem("fingerVerified");
            localStorage.removeItem("pendingCandidate");

            window.location.replace("page.html");

        } else {
            alert(data.message);
        }

    } catch (err) {
        console.error(err);
        alert("❌ Vote submission failed.");
    }
}


// 📊 Load candidates
async function loadCandidates(state, district, constituency) {

    const grid = document.getElementById("candidateGrid");

    try {

        const response = await fetch(
            `/candidates?state=${state}&district=${district}&constituency=${constituency}`
        );

        const candidates = await response.json();

        grid.innerHTML = "";

        candidates.forEach(c => {

            const card = document.createElement("div");

            card.classList.add("card");
            card.dataset.id = c.candidateId;

            card.innerHTML = `
                <div class="selected-badge">✔ Selected</div>

                <div class="card-header">
                    <div class="avatar">${c.name.charAt(0)}</div>

                    <div>
                        <div class="candidate-name">${c.name}</div>
                        <div class="party">${c.party}</div>
                    </div>
                </div>

                <div class="candidate-id">
                    Candidate ID: ${c.candidateId}
                </div>
            `;

            grid.appendChild(card);
        });

        activateSelection();

    } catch (err) {
        console.error("Failed to load candidates", err);
    }
}


// 🎯 Candidate selection
function activateSelection() {

    const cards = document.querySelectorAll(".card");

    cards.forEach(card => {

        card.addEventListener("click", function () {

            cards.forEach(c => {
                c.classList.remove("selected");
                c.classList.add("faded");
            });

            this.classList.remove("faded");
            this.classList.add("selected");

            selectedCandidate = this.dataset.id;
        });

    });
}