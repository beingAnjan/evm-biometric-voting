let selectedCandidate = null;
let candidateById = new Map();
let electionIsOpen = false;
let electionStatusData = null;
let isSubmitting = false;

document.addEventListener("DOMContentLoaded", function () {
    if (localStorage.getItem("voterLoggedIn") !== "true") {
        window.location.replace("page.html");
        return;
    }

    const voterName = localStorage.getItem("voterName") || "Voter";
    const state = localStorage.getItem("state") || "";
    const district = localStorage.getItem("district") || "";
    const constituency = localStorage.getItem("constituency") || "";

    document.getElementById("voterName").textContent = voterName;
    document.getElementById("localTime").textContent = new Intl.DateTimeFormat(undefined, {
        weekday: "short", hour: "numeric", minute: "2-digit"
    }).format(new Date());

    const location = [constituency, district, state].filter(Boolean).join(", ");
    document.getElementById("locationSummary").textContent =
        location ? "Candidates for " + location : "Candidates for your constituency";
    document.getElementById("constituencyFooter").textContent = location;

    document.getElementById("logoutBtn").addEventListener("click", logout);
    document.getElementById("voteBtn").addEventListener("click", showConfirmation);
    document.getElementById("changeChoiceBtn").addEventListener("click", function () {
        document.getElementById("confirmDialog").close();
    });
    document.getElementById("confirmChoiceBtn").addEventListener("click", continueVoteFlow);

    loadElectionStatus();
    loadCandidates(state, district, constituency);
    setInterval(updateClock, 30000);
    setInterval(updateCountdown, 1000);
    setInterval(loadElectionStatus, 60000);

    if (localStorage.getItem("fingerVerified") === "true" && localStorage.getItem("pendingCandidate")) {
        document.getElementById("actionMessage").textContent = "Fingerprint verified. Submitting your vote…";
        submitVote();
    }
});

function updateClock() {
    const time = document.getElementById("localTime");
    if (time) {
        time.textContent = new Intl.DateTimeFormat(undefined, {
            weekday: "short", hour: "numeric", minute: "2-digit"
        }).format(new Date());
    }
}

function logout() {
    [
        "voterLoggedIn", "voterName", "state", "district", "constituency",
        "voterId", "fingerVerified", "pendingCandidate"
    ].forEach(function (key) {
        localStorage.removeItem(key);
    });
    window.location.replace("page.html");
}

async function loadElectionStatus() {
    const card = document.getElementById("electionCard");
    const title = document.getElementById("electionTitle");
    const detail = document.getElementById("electionDetail");
    const badge = document.getElementById("statusBadge");
    const symbol = document.getElementById("statusSymbol");
    const countdown = document.getElementById("countdown");

    try {
        const response = await fetch("/election-status");
        const data = await response.json();
        if (!response.ok) throw new Error("Could not check election status.");

        electionStatusData = data;
        electionIsOpen = data.isOpen === true;
        const status = data.status || "not_configured";
        card.dataset.status = status;
        badge.textContent = {
            open: "Voting open",
            scheduled: "Scheduled",
            closed: "Closed",
            not_configured: "Not configured"
        }[status] || "Unavailable";
        symbol.textContent = status === "open" ? "✓" : status === "closed" ? "×" : status === "scheduled" ? "◷" : "!";
        title.textContent = data.title || "Election details";
        countdown.textContent = "";

        if (status === "open") {
            detail.textContent = "Voting is open. Choose your candidate and complete fingerprint verification.";
            if (data.endAt) countdown.textContent = "Closes " + formatDate(data.endAt);
        } else if (status === "scheduled") {
            detail.textContent = data.startAt
                ? "Voting opens " + formatDate(data.startAt) + "."
                : "Voting has not started yet.";
        } else if (status === "closed") {
            detail.textContent = data.endAt
                ? "Voting closed " + formatDate(data.endAt) + "."
                : "Voting is currently closed.";
        } else {
            detail.textContent = "The election has not been set up yet. Please check back later.";
        }

        updateVoteButton();
        updateCountdown();
    } catch (error) {
        electionIsOpen = false;
        card.dataset.status = "closed";
        badge.textContent = "Unavailable";
        symbol.textContent = "!";
        title.textContent = "Election status unavailable";
        detail.textContent = "We couldn’t check whether voting is open. Please refresh and try again.";
        countdown.textContent = "";
        updateVoteButton();
    }
}

function updateCountdown() {
    const countdown = document.getElementById("countdown");
    if (!countdown || !electionStatusData) return;

    if (electionStatusData.status === "scheduled" && electionStatusData.startAt) {
        countdown.textContent = "Opens in " + formatDuration(new Date(electionStatusData.startAt).getTime() - Date.now());
    } else if (electionStatusData.status === "open" && electionStatusData.endAt) {
        countdown.textContent = "Closes in " + formatDuration(new Date(electionStatusData.endAt).getTime() - Date.now());
    } else {
        countdown.textContent = "";
    }
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "at the scheduled time";
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium", timeStyle: "short"
    }).format(date);
}

function formatDuration(milliseconds) {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "a moment";
    const totalMinutes = Math.ceil(milliseconds / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(days + "d");
    if (hours) parts.push(hours + "h");
    if (minutes || parts.length === 0) parts.push(minutes + "m");
    return parts.join(" ");
}

async function loadCandidates(state, district, constituency) {
    const grid = document.getElementById("candidateGrid");
    const count = document.getElementById("candidateCount");
    const params = new URLSearchParams({ state: state, district: district, constituency: constituency });

    try {
        const response = await fetch("/candidates?" + params.toString());
        if (!response.ok) throw new Error("Could not load candidates.");
        const candidates = await response.json();
        if (!Array.isArray(candidates)) throw new Error("The candidate list is not available.");

        grid.replaceChildren();
        candidateById = new Map();
        count.textContent = candidates.length + (candidates.length === 1 ? " candidate" : " candidates");

        if (candidates.length === 0) {
            showEmptyState("No candidates were found for your constituency. Please contact the election administrator.");
            return;
        }

        candidates.forEach(function (candidate) {
            const id = String(candidate.candidateId || "");
            candidateById.set(id, candidate);

            const card = document.createElement("button");
            card.type = "button";
            card.className = "candidate-card";
            card.dataset.id = id;
            card.setAttribute("aria-pressed", "false");

            const avatar = document.createElement("span");
            avatar.className = "candidate-avatar";
            avatar.setAttribute("aria-hidden", "true");
            avatar.textContent = String(candidate.name || "?").trim().charAt(0).toUpperCase();

            const details = document.createElement("span");
            details.className = "candidate-details";

            const name = document.createElement("span");
            name.className = "candidate-name";
            name.textContent = candidate.name || "Candidate";

            const party = document.createElement("span");
            party.className = "party";
            party.textContent = candidate.party || "Independent";

            const candidateId = document.createElement("span");
            candidateId.className = "candidate-id";
            candidateId.textContent = id ? "Candidate ID: " + id : "";

            details.append(name, party, candidateId);

            const indicator = document.createElement("span");
            indicator.className = "selection-indicator";
            indicator.setAttribute("aria-hidden", "true");
            indicator.textContent = "✓";

            card.append(avatar, details, indicator);
            card.addEventListener("click", function () {
                selectCandidate(card, id);
            });
            grid.appendChild(card);
        });

        updateVoteButton();
    } catch (error) {
        count.textContent = "Candidates unavailable";
        showEmptyState("We couldn’t load the candidates. Please refresh the page or contact the election administrator.");
    }
}

function showEmptyState(message) {
    const grid = document.getElementById("candidateGrid");
    const state = document.createElement("div");
    state.className = "empty-state";
    state.textContent = message;
    grid.replaceChildren(state);
}

function selectCandidate(card, candidateId) {
    selectedCandidate = candidateId;
    document.querySelectorAll(".candidate-card").forEach(function (candidateCard) {
        const isSelected = candidateCard === card;
        candidateCard.classList.toggle("selected", isSelected);
        candidateCard.setAttribute("aria-pressed", String(isSelected));
    });

    const candidate = candidateById.get(candidateId);
    document.getElementById("selectionNote").lastElementChild.textContent =
        "Selected " + (candidate && candidate.name ? candidate.name : "candidate") +
        ". You can review your choice before continuing.";
    document.getElementById("actionMessage").textContent = "";
    updateVoteButton();
}

function updateVoteButton() {
    const button = document.getElementById("voteBtn");
    if (!electionIsOpen) {
        button.disabled = true;
        button.innerHTML = 'Voting is unavailable <span aria-hidden="true">•</span>';
    } else if (!selectedCandidate) {
        button.disabled = true;
        button.innerHTML = 'Select a candidate <span aria-hidden="true">→</span>';
    } else {
        button.disabled = false;
        button.innerHTML = 'Review your choice <span aria-hidden="true">→</span>';
    }
}

function showConfirmation() {
    if (!electionIsOpen || !selectedCandidate) return;
    const candidate = candidateById.get(selectedCandidate);
    if (!candidate) return;

    document.getElementById("reviewAvatar").textContent =
        String(candidate.name || "?").trim().charAt(0).toUpperCase();
    document.getElementById("reviewName").textContent = candidate.name || "Candidate";
    document.getElementById("reviewParty").textContent = candidate.party || "Independent";
    document.getElementById("confirmDialog").showModal();
}

function continueVoteFlow() {
    document.getElementById("confirmDialog").close();
    if (!electionIsOpen || !selectedCandidate) {
        document.getElementById("actionMessage").textContent = "Voting is no longer open. Your selection was not submitted.";
        return;
    }

    localStorage.setItem("pendingCandidate", selectedCandidate);
    if (localStorage.getItem("fingerVerified") !== "true") {
        window.location.href = "fingerprint.html";
        return;
    }
    submitVote();
}

async function submitVote() {
    if (isSubmitting) return;
    isSubmitting = true;
    const button = document.getElementById("confirmChoiceBtn");
    button.disabled = true;
    button.textContent = "Submitting…";

    const voterName = localStorage.getItem("voterName");
    const candidateId = localStorage.getItem("pendingCandidate") || selectedCandidate;

    try {
        const response = await fetch("/vote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voterName: voterName, candidateId: candidateId })
        });
        const data = await response.json();

        if (!response.ok) {
            document.getElementById("actionMessage").textContent = data.message || "Your vote could not be submitted.";
            localStorage.removeItem("fingerVerified");
            localStorage.removeItem("pendingCandidate");
            return;
        }

        document.getElementById("actionMessage").textContent = "Your vote has been recorded. Thank you for participating.";
        [
            "voterLoggedIn", "voterName", "state", "district", "constituency",
            "voterId", "fingerVerified", "pendingCandidate"
        ].forEach(function (key) {
            localStorage.removeItem(key);
        });
        document.getElementById("voteBtn").disabled = true;
        window.location.replace("page.html");
    } catch (error) {
        document.getElementById("actionMessage").textContent = "Could not connect to the server. Please try again.";
    } finally {
        isSubmitting = false;
        button.disabled = false;
        button.textContent = "Continue";
    }
}