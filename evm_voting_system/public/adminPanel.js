// 🔐 Prevent direct access without login
if (sessionStorage.getItem("adminLoggedIn") !== "true") {
    window.location.replace("page.html");
}

/* ================= GLOBAL DATA ================= */

let electionData = [];
const stateName = "Andhra Pradesh";

/* ================= SECTION SWITCH ================= */

function hideAllSections() {
    document.getElementById("dashboardSection").style.display = "none";
    document.getElementById("electionSection").style.display = "none";
    document.getElementById("constituencySection").style.display = "none";
    document.getElementById("reportsSection").style.display = "none";
}

function showSection(section) {
    hideAllSections();

    const titles = {
        dashboard: "Dashboard",
        election: "Election settings",
        constituency: "Constituencies",
        reports: "Reports & analytics"
    };
    document.getElementById("pageTitle").innerText = titles[section] || "Dashboard";
    document.getElementById(section + "Section").style.display = "block";

    document.querySelectorAll(".nav-item[data-section]").forEach((item) => {
        item.classList.toggle("active", item.dataset.section === section);
    });

    if (section === "dashboard") loadDashboard();
    if (section === "election") loadElectionSettings();
    if (section === "constituency") initializeDropdowns();
    if (section === "reports") loadReports();
}

function toLocalDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}

function showElectionState(data) {
    const state = document.getElementById("electionState");
    const labels = {
        not_configured: "No election has been configured yet.",
        scheduled: "Scheduled — voting is not open yet.",
        open: "Open — voters can cast a vote.",
        closed: "Closed — voters cannot cast a vote."
    };
    state.textContent = labels[data.status] || labels.not_configured;
    state.dataset.status = data.status || "not_configured";
}

async function loadElectionSettings() {
    const message = document.getElementById("electionMessage");
    message.textContent = "";
    try {
        const response = await fetch("/admin/election");
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load election settings.");
        document.getElementById("electionTitle").value = data.title || "";
        document.getElementById("electionStart").value = toLocalDateTime(data.startAt);
        document.getElementById("electionEnd").value = toLocalDateTime(data.endAt);
        document.getElementById("electionEnabled").checked = Boolean(data.enabled);

        const statusResponse = await fetch("/election-status");
        showElectionState(await statusResponse.json());
    } catch (error) {
        message.textContent = error.message;
    }
}

document.getElementById("electionForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("electionMessage");
    message.textContent = "Saving…";
    const payload = {
        title: document.getElementById("electionTitle").value.trim(),
        startAt: new Date(document.getElementById("electionStart").value).toISOString(),
        endAt: new Date(document.getElementById("electionEnd").value).toISOString(),
        enabled: document.getElementById("electionEnabled").checked
    };

    try {
        const response = await fetch("/admin/election", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not save election settings.");
        showElectionState(data);
        message.textContent = "Election settings saved.";
        loadDashboardElectionStatus();
    } catch (error) {
        message.textContent = error.message;
    }
});

/* ================= LOAD JSON DATA ================= */

async function loadElectionData() {

    if (electionData.length > 0) return;

    const response = await fetch("india_election_data.json");
    const json = await response.json();

    electionData = json.states;
}

/* ================= INITIALIZE DISTRICTS ================= */

async function initializeDropdowns() {

    await loadElectionData();

    const districtSelect = document.getElementById("districtSelect");

    districtSelect.innerHTML = '<option value="">Select District</option>';

    const selectedState = electionData.find(s => s.state === stateName);

    if (!selectedState) return;

    selectedState.districts.forEach(d => {

        districtSelect.innerHTML +=
            `<option value="${d.district}">${d.district}</option>`;

    });

    document.getElementById("constituencySelect").innerHTML =
        '<option value="">Select Constituency</option>';

    document.getElementById("constituencyTable").replaceChildren();
    document.getElementById("resultsPanel").hidden = true;
    showResultsMessage("Choose a constituency", "Select a district and constituency to see the candidate vote breakdown.");
}

/* ================= LOAD CONSTITUENCIES ================= */

function loadConstituenciesDropdown() {

    const districtName = document.getElementById("districtSelect").value;

    const constituencySelect = document.getElementById("constituencySelect");

    constituencySelect.innerHTML =
        '<option value="">Select Constituency</option>';
    document.getElementById("constituencyTable").replaceChildren();
    document.getElementById("resultsPanel").hidden = true;
    showResultsMessage("Choose a constituency", "Select a constituency in " + (districtName || "your district") + " to view candidate results.");

    const selectedState = electionData.find(s => s.state === stateName);

    if (!selectedState) return;

    const selectedDistrict =
        selectedState.districts.find(d => d.district === districtName);

    if (!selectedDistrict) return;

    selectedDistrict.constituencies.forEach(c => {

        constituencySelect.innerHTML +=
            `<option value="${c}">${c}</option>`;

    });
}

/* ================= FILTER TABLE + LOAD RESULTS ================= */

async function filterConstituency() {
    const district = document.getElementById("districtSelect").value;
    const constituency = document.getElementById("constituencySelect").value;
    const resultsPanel = document.getElementById("resultsPanel");
    const resultsEmpty = document.getElementById("resultsEmpty");

    resultsPanel.hidden = true;
    if (!constituency) {
        showResultsMessage("Choose a constituency", "Select a district and constituency to see the candidate vote breakdown.");
        return;
    }

    showResultsMessage("Loading results…", "Fetching the latest recorded candidate votes.");

    try {
        const params = new URLSearchParams({
            state: stateName,
            district: district,
            constituency: constituency
        });
        const [resultsResponse, candidatesResponse] = await Promise.all([
            fetch("/results?" + params.toString()),
            fetch("/candidates?" + params.toString())
        ]);

        const data = await resultsResponse.json();
        if (!resultsResponse.ok) throw new Error(data.message || "Could not load constituency results.");
        const candidates = candidatesResponse.ok ? await candidatesResponse.json() : [];
        const candidateById = new Map(
            (Array.isArray(candidates) ? candidates : []).map((candidate) => [
                String(candidate.candidateId),
                candidate
            ])
        );

        const totalVotes = Number(data.totalVotes) || 0;
        const results = Array.isArray(data.results) ? data.results : [];
        document.getElementById("resultPlace").textContent = constituency;
        document.getElementById("resultTotalVotes").textContent = totalVotes.toLocaleString();

        let winner = data.winner || "--";
        if (winner !== "Tie" && winner !== "--") {
            const leadingCandidate = candidateById.get(String(winner));
            if (leadingCandidate && leadingCandidate.name) winner = leadingCandidate.name;
        }
        document.getElementById("resultWinner").textContent = winner;
        document.getElementById("resultCandidateCount").textContent =
            results.length + (results.length === 1 ? " candidate with votes" : " candidates with votes");

        const resultList = document.getElementById("constituencyTable");
        resultList.replaceChildren();

        if (results.length === 0) {
            const empty = document.createElement("div");
            empty.className = "results-empty inline";
            empty.textContent = "No votes have been recorded in this constituency yet.";
            resultList.appendChild(empty);
        } else {
            results.forEach((result, index) => {
                const candidateId = String(result._id || "");
                const candidate = candidateById.get(candidateId);
                const votes = Number(result.votes) || 0;
                const share = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                const isLeading = data.winner !== "Tie" && candidateId === String(data.winner);

                const row = document.createElement("article");
                row.className = "candidate-result-row" + (isLeading ? " is-leading" : "");
                row.setAttribute("role", "listitem");

                const top = document.createElement("div");
                top.className = "candidate-result-top";

                const identity = document.createElement("div");
                identity.className = "result-candidate";

                const rank = document.createElement("span");
                rank.className = "result-rank";
                rank.textContent = String(index + 1).padStart(2, "0");

                const copy = document.createElement("span");
                copy.className = "result-candidate-copy";

                const name = document.createElement("strong");
                name.textContent = candidate && candidate.name ? candidate.name : "Candidate " + candidateId;

                const party = document.createElement("small");
                party.textContent = candidate && candidate.party ? candidate.party : "Candidate ID: " + candidateId;

                copy.append(name, party);
                identity.append(rank, copy);

                const voteCount = document.createElement("span");
                voteCount.className = "result-votes";
                voteCount.textContent = votes.toLocaleString() + (votes === 1 ? " vote" : " votes");

                const percentage = document.createElement("span");
                percentage.className = "result-share";
                percentage.textContent = share.toFixed(1) + "%";

                top.append(identity, voteCount, percentage);

                const track = document.createElement("div");
                track.className = "result-track";
                track.setAttribute("role", "img");
                track.setAttribute("aria-label", share.toFixed(1) + "% of recorded votes");

                const fill = document.createElement("div");
                fill.className = "result-track-fill";
                fill.style.width = share.toFixed(1) + "%";
                track.appendChild(fill);

                row.append(top, track);
                resultList.appendChild(row);
            });
        }

        resultsEmpty.hidden = true;
        resultsPanel.hidden = false;
    } catch (error) {
        resultsPanel.hidden = true;
        showResultsMessage("Results unavailable", error.message || "Could not load constituency results. Please try again.");
    }
}

function showResultsMessage(title, message) {
    const resultsEmpty = document.getElementById("resultsEmpty");
    resultsEmpty.hidden = false;
    resultsEmpty.querySelector("strong").textContent = title;
    resultsEmpty.querySelector("p").textContent = message;
}

/* ================= DASHBOARD ================= */

let dashboardLoading = false;

async function loadDashboard() {
    if (dashboardLoading) return;
    dashboardLoading = true;

    const stats = document.getElementById("dashboardStats");
    const totalVotes = document.getElementById("totalVotes");
    const registeredVoters = document.getElementById("registeredVoters");
    const turnout = document.getElementById("turnout");
    const leadingCandidate = document.getElementById("leadingCandidate");
    stats.setAttribute("aria-busy", "true");

    try {
        const response = await fetch("/admin/dashboard");
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load dashboard statistics.");

        totalVotes.textContent = Number(data.totalVotes || 0).toLocaleString();
        registeredVoters.textContent = Number(data.registeredVoters || 0).toLocaleString();
        turnout.textContent = Number(data.turnout || 0) + "%";
        leadingCandidate.textContent = data.leadingCandidate || "--";
        document.getElementById("dashboardUpdated").textContent =
            "Updated " + new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
    } catch (error) {
        totalVotes.textContent = "—";
        registeredVoters.textContent = "—";
        turnout.textContent = "—";
        leadingCandidate.textContent = "—";
        document.getElementById("dashboardUpdated").textContent = "Could not refresh";
        console.error("Dashboard loading error:", error);
    } finally {
        stats.setAttribute("aria-busy", "false");
        dashboardLoading = false;
    }

    loadDashboardElectionStatus();
}

async function loadDashboardElectionStatus() {
    const card = document.getElementById("dashboardElectionCard");
    const title = document.getElementById("dashboardElectionTitle");
    const detail = document.getElementById("dashboardElectionDetail");
    const badge = document.getElementById("dashboardStatusBadge");
    const symbol = document.getElementById("dashboardStatusSymbol");

    try {
        const response = await fetch("/election-status");
        const data = await response.json();
        if (!response.ok) throw new Error("Could not load election status.");

        const status = data.status || "not_configured";
        card.dataset.status = status;
        title.textContent = data.title || "No election configured";
        badge.textContent = {
            open: "Voting open",
            scheduled: "Scheduled",
            closed: "Closed",
            not_configured: "Not configured"
        }[status] || "Unavailable";
        symbol.textContent = status === "open" ? "✓" : status === "scheduled" ? "◷" : status === "closed" ? "×" : "!";

        if (status === "open") {
            detail.textContent = data.endAt
                ? "Voters can cast a ballot now. Voting closes " + formatDashboardDate(data.endAt) + "."
                : "Voters can cast a ballot now.";
        } else if (status === "scheduled") {
            detail.textContent = data.startAt
                ? "Voting is scheduled to open " + formatDashboardDate(data.startAt) + "."
                : "Voting is scheduled but has not opened.";
        } else if (status === "closed") {
            detail.textContent = "Voters cannot cast a ballot while voting is closed.";
        } else {
            detail.textContent = "Set an election name and voting window to get started.";
        }
    } catch (error) {
        card.dataset.status = "closed";
        title.textContent = "Election status unavailable";
        detail.textContent = "Could not load the current election status.";
        badge.textContent = "Unavailable";
        symbol.textContent = "!";
    }
}

function formatDashboardDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "at the scheduled time";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/* ================= REPORTS ================= */

async function loadReports() {
    const closeFights = document.getElementById("closeFights");
    const highestTurnout = document.getElementById("highestTurnout");
    const fightCount = document.getElementById("reportsFightCount");
    closeFights.replaceChildren(createReportMessage("Loading close races…"));
    highestTurnout.replaceChildren(createReportMessage("Loading turnout…"));

    try {
        const response = await fetch("/admin/reports");
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load reports.");

        const fights = Array.isArray(data.closeFights) ? data.closeFights : [];
        fightCount.textContent = fights.length ? fights.length + (fights.length === 1 ? " race" : " races") : "";
        closeFights.replaceChildren();

        if (fights.length === 0) {
            closeFights.appendChild(createReportMessage("No close races to show yet. More than one candidate needs recorded votes in a constituency."));
        } else {
            fights.forEach((fight, index) => {
                const row = document.createElement("div");
                row.className = "fight-row";

                const details = document.createElement("div");
                details.className = "fight-details";

                const title = document.createElement("strong");
                title.textContent = fight.constituency || "Unknown constituency";

                const area = document.createElement("span");
                area.textContent = [fight.district, fight.state].filter(Boolean).join(", ") || "Location unavailable";

                const candidates = document.createElement("small");
                candidates.textContent = fight.leadingCandidate + " leads " + fight.runnerUp;

                details.append(title, area, candidates);

                const margin = document.createElement("span");
                margin.className = fight.margin === 0 ? "margin-badge tied" : "margin-badge";
                margin.textContent = fight.margin === 0
                    ? "Tied"
                    : Number(fight.margin).toLocaleString() + " vote" + (fight.margin === 1 ? "" : "s");

                const number = document.createElement("span");
                number.className = "fight-number";
                number.textContent = String(index + 1).padStart(2, "0");

                row.append(number, details, margin);
                closeFights.appendChild(row);
            });
        }

        highestTurnout.replaceChildren();
        if (!data.highestTurnout) {
            highestTurnout.appendChild(createReportMessage("No turnout data is available yet. It will appear after a constituency has recorded votes."));
        } else {
            const result = data.highestTurnout;
            const card = document.createElement("div");
            card.className = "turnout-result";

            const value = document.createElement("strong");
            value.className = "turnout-value";
            value.textContent = Number(result.turnout).toFixed(1) + "%";

            const constituency = document.createElement("strong");
            constituency.className = "turnout-location";
            constituency.textContent = result.constituency || "Unknown constituency";

            const area = document.createElement("span");
            area.className = "turnout-area";
            area.textContent = [result.district, result.state].filter(Boolean).join(", ");

            const participation = document.createElement("p");
            participation.textContent = Number(result.votes).toLocaleString() + " of " +
                Number(result.registeredVoters).toLocaleString() + " registered voters";

            card.append(value, constituency, area, participation);
            highestTurnout.appendChild(card);
        }

        document.getElementById("reportsUpdated").textContent =
            "Updated " + new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
    } catch (error) {
        closeFights.replaceChildren(createReportMessage("Could not load reports. Please try refreshing."));
        highestTurnout.replaceChildren(createReportMessage("Turnout is unavailable right now."));
        fightCount.textContent = "";
        document.getElementById("reportsUpdated").textContent = "Could not refresh";
        console.error("Reports loading error:", error);
    }
}

function createReportMessage(message) {
    const element = document.createElement("p");
    element.className = "report-empty";
    element.textContent = message;
    return element;
}

/* ================= LOGOUT ================= */

function logout() {

    sessionStorage.removeItem("adminLoggedIn");
    fetch("/logout", { method: "POST" }).finally(() => {
        window.location.replace("page.html");
    });

}

/* ================= INITIAL LOAD ================= */

const adminName = sessionStorage.getItem("adminName");
if (adminName) document.getElementById("adminName").textContent = adminName;
document.getElementById("refreshDashboardBtn").addEventListener("click", loadDashboard);
document.getElementById("refreshReportsBtn").addEventListener("click", loadReports);

window.onload = function () {
    showSection("dashboard");
};

setInterval(function () {
    if (document.getElementById("dashboardSection").style.display !== "none") {
        loadDashboard();
    }
    if (document.getElementById("reportsSection").style.display !== "none") {
        loadReports();
    }
}, 60000);
