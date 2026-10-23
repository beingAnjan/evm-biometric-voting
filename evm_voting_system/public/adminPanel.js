// 🔐 Prevent direct access without login
if (sessionStorage.getItem("adminLoggedIn") !== "true") {
    window.location.replace("page.html");
}

/* ================= GLOBAL DATA ================= */

let electionData = [];
let currentConstituencyResults = null;
const stateName = "Andhra Pradesh";

/* ================= SECTION SWITCH ================= */

function hideAllSections() {
    document.getElementById("dashboardSection").style.display = "none";
    document.getElementById("electionSection").style.display = "none";
    document.getElementById("constituencySection").style.display = "none";
    document.getElementById("reportsSection").style.display = "none";
}

const adminSectionTitles = {
    dashboard: "Dashboard",
    election: "Election settings",
    constituency: "Constituencies",
    reports: "Reports & analytics"
};

function getSectionFromLocation() {
    const section = window.location.hash.slice(1);
    return Object.prototype.hasOwnProperty.call(adminSectionTitles, section) ? section : "dashboard";
}

function showSection(section, updateHistory = true) {
    if (!Object.prototype.hasOwnProperty.call(adminSectionTitles, section)) {
        section = "dashboard";
    }

    document.documentElement.setAttribute("data-admin-section", section);

    if (updateHistory && window.location.hash !== "#" + section) {
        window.history.pushState({ adminSection: section }, "", "#" + section);
    }

    hideAllSections();

    document.getElementById("pageTitle").innerText = adminSectionTitles[section];
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

    selectedState.districts.forEach((district) => {
        const option = document.createElement("option");
        option.value = district.district;
        option.textContent = district.district;
        districtSelect.appendChild(option);
    });

    const savedDistrict = sessionStorage.getItem("adminDistrict");
    if (savedDistrict && Array.from(districtSelect.options).some((option) => option.value === savedDistrict)) {
        districtSelect.value = savedDistrict;
    } else {
        sessionStorage.removeItem("adminDistrict");
        sessionStorage.removeItem("adminConstituency");
    }

    document.getElementById("constituencySelect").innerHTML =
        '<option value="">Select Constituency</option>';
    document.getElementById("constituencyTable").replaceChildren();
    clearConstituencyExport();
    document.getElementById("resultsPanel").hidden = true;
    showResultsMessage("Choose a constituency", "Select a district and constituency to see the candidate vote breakdown.");

    if (districtSelect.value) loadConstituenciesDropdown(true);
}

/* ================= LOAD CONSTITUENCIES ================= */

function loadConstituenciesDropdown(restoreSavedSelection = false) {

    const districtName = document.getElementById("districtSelect").value;
    const savedConstituency = restoreSavedSelection ? sessionStorage.getItem("adminConstituency") : null;
    if (districtName) sessionStorage.setItem("adminDistrict", districtName);
    else sessionStorage.removeItem("adminDistrict");
    if (!restoreSavedSelection) sessionStorage.removeItem("adminConstituency");

    const constituencySelect = document.getElementById("constituencySelect");

    constituencySelect.innerHTML =
        '<option value="">Select Constituency</option>';
    document.getElementById("constituencyTable").replaceChildren();
    clearConstituencyExport();
    document.getElementById("resultsPanel").hidden = true;
    showResultsMessage("Choose a constituency", "Select a constituency in " + (districtName || "your district") + " to view candidate results.");

    const selectedState = electionData.find(s => s.state === stateName);

    if (!selectedState) return;

    const selectedDistrict =
        selectedState.districts.find(d => d.district === districtName);

    if (!selectedDistrict) return;

    selectedDistrict.constituencies.forEach((constituency) => {
        const option = document.createElement("option");
        option.value = constituency;
        option.textContent = constituency;
        constituencySelect.appendChild(option);
    });

    if (restoreSavedSelection && savedConstituency) {
        const savedValueExists = Array.from(constituencySelect.options)
            .some((option) => option.value === savedConstituency);
        if (savedValueExists) {
            constituencySelect.value = savedConstituency;
            filterConstituency();
        } else {
            sessionStorage.removeItem("adminConstituency");
        }
    }
}

/* ================= FILTER TABLE + LOAD RESULTS ================= */

async function filterConstituency() {
    const district = document.getElementById("districtSelect").value;
    const constituency = document.getElementById("constituencySelect").value;
    if (district) sessionStorage.setItem("adminDistrict", district);
    else sessionStorage.removeItem("adminDistrict");
    if (constituency) sessionStorage.setItem("adminConstituency", constituency);
    else sessionStorage.removeItem("adminConstituency");
    const resultsPanel = document.getElementById("resultsPanel");
    const resultsEmpty = document.getElementById("resultsEmpty");

    resultsPanel.hidden = true;
    clearConstituencyExport();
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
        const exportRows = results.map((result) => {
            const candidateId = String(result._id || "");
            const candidate = candidateById.get(candidateId);
            const votes = Number(result.votes) || 0;
            return {
                candidateId: candidateId,
                name: candidate && candidate.name ? candidate.name : "Candidate " + candidateId,
                party: candidate && candidate.party ? candidate.party : "",
                votes: votes,
                share: totalVotes > 0 ? (votes / totalVotes) * 100 : 0
            };
        });
        currentConstituencyResults = {
            state: stateName,
            district: district,
            constituency: constituency,
            totalVotes: totalVotes,
            candidates: exportRows
        };
        document.getElementById("downloadResultsBtn").disabled = exportRows.length === 0;
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
        clearConstituencyExport();
        resultsPanel.hidden = true;
        showResultsMessage("Results unavailable", error.message || "Could not load constituency results. Please try again.");
    }
}

function clearConstituencyExport() {
    currentConstituencyResults = null;
    const button = document.getElementById("downloadResultsBtn");
    if (button) button.disabled = true;
}

function csvCell(value) {
    let text = String(value == null ? "" : value);
    if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}

function downloadConstituencyCsv() {
    if (!currentConstituencyResults || currentConstituencyResults.candidates.length === 0) return;

    const report = currentConstituencyResults;
    const rows = [[
        "State", "District", "Constituency", "Candidate", "Party",
        "Candidate ID", "Votes", "Vote Share (%)", "Total Votes"
    ]];

    report.candidates.forEach((candidate) => {
        rows.push([
            report.state, report.district, report.constituency,
            candidate.name, candidate.party, candidate.candidateId,
            candidate.votes, candidate.share.toFixed(1), report.totalVotes
        ]);
    });

    const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = [report.district, report.constituency]
        .filter(Boolean)
        .join("-")
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "") || "constituency-results";

    link.href = url;
    link.download = safeName + "-results-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    const constituencyTurnout = document.getElementById("constituencyTurnout");
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

        renderTurnoutBreakdown(data.constituencyTurnout, constituencyTurnout);

        document.getElementById("reportsUpdated").textContent =
            "Updated " + new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
        return true;
    } catch (error) {
        closeFights.replaceChildren(createReportMessage("Could not load reports. Please try refreshing."));
        highestTurnout.replaceChildren(createReportMessage("Turnout is unavailable right now."));
        constituencyTurnout.replaceChildren();
        const errorRow = document.createElement("tr");
        const errorCell = document.createElement("td");
        errorCell.colSpan = 5;
        errorCell.className = "table-empty";
        errorCell.textContent = "Constituency turnout is unavailable right now.";
        errorRow.appendChild(errorCell);
        constituencyTurnout.appendChild(errorRow);
        fightCount.textContent = "";
        document.getElementById("reportsUpdated").textContent = "Could not refresh";
        console.error("Reports loading error:", error);
        return false;
    }
}

async function printElectionSummary() {
    const button = document.getElementById("printSummaryBtn");
    const originalLabel = button.innerHTML;
    button.disabled = true;
    button.textContent = "Preparing…";

    try {
        const reportsLoaded = await loadReports();
        if (!reportsLoaded) throw new Error("Reports could not be refreshed. Please try again before printing.");

        const [dashboardResponse, statusResponse] = await Promise.all([
            fetch("/admin/dashboard"),
            fetch("/election-status")
        ]);
        const [dashboard, election] = await Promise.all([
            dashboardResponse.json(),
            statusResponse.json()
        ]);
        if (!dashboardResponse.ok) throw new Error(dashboard.message || "Could not load participation totals.");
        if (!statusResponse.ok) throw new Error(election.message || "Could not load election status.");

        const statusLabels = {
            open: "Voting open",
            scheduled: "Scheduled",
            closed: "Closed",
            not_configured: "Not configured"
        };
        document.getElementById("printElectionTitle").textContent = election.title || "Election summary";
        document.getElementById("printElectionStatus").textContent =
            "Status: " + (statusLabels[election.status] || "Unavailable");
        document.getElementById("printElectionWindow").textContent =
            election.startAt && election.endAt
                ? "Voting window: " + formatDashboardDate(election.startAt) + " – " + formatDashboardDate(election.endAt)
                : "Voting window: Not configured";
        document.getElementById("printGeneratedAt").textContent =
            "Prepared: " + new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date());
        document.getElementById("printTotalVotes").textContent = Number(dashboard.totalVotes || 0).toLocaleString();
        document.getElementById("printRegisteredVoters").textContent = Number(dashboard.registeredVoters || 0).toLocaleString();
        document.getElementById("printOverallTurnout").textContent = Number(dashboard.turnout || 0) + "%";

        document.body.classList.add("printing-summary");
        window.print();
    } catch (error) {
        const updated = document.getElementById("reportsUpdated");
        updated.textContent = error.message || "Could not prepare the summary";
    } finally {
        button.disabled = false;
        button.innerHTML = originalLabel;
    }
}

window.addEventListener("afterprint", () => {
    document.body.classList.remove("printing-summary");
});

function renderTurnoutBreakdown(rows, body) {
    body.replaceChildren();
    if (!Array.isArray(rows) || rows.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.className = "table-empty";
        cell.textContent = "No constituency voter records are available yet.";
        row.appendChild(cell);
        body.appendChild(row);
        return;
    }

    rows.forEach((item) => {
        const row = document.createElement("tr");
        const constituencyCell = document.createElement("td");
        constituencyCell.className = "turnout-constituency";
        const name = document.createElement("strong");
        name.textContent = item.constituency || "Unknown constituency";
        const area = document.createElement("small");
        area.textContent = [item.district, item.state].filter(Boolean).join(", ") || "Location unavailable";
        constituencyCell.append(name, area);

        const registered = Number(item.registeredVoters) || 0;
        const votes = Number(item.votes) || 0;
        const notVoted = Number(item.notVoted) || 0;
        const registeredCell = document.createElement("td");
        registeredCell.textContent = registered.toLocaleString();
        const votedCell = document.createElement("td");
        votedCell.textContent = votes.toLocaleString();
        const remainingCell = document.createElement("td");
        remainingCell.textContent = notVoted.toLocaleString();

        const turnoutCell = document.createElement("td");
        turnoutCell.className = "turnout-cell";
        if (item.turnout === null || item.turnout === undefined) {
            turnoutCell.textContent = "No registered voters";
        } else {
            const percentage = Number(item.turnout);
            const label = document.createElement("strong");
            label.textContent = percentage.toFixed(1) + "%";
            const track = document.createElement("div");
            track.className = "turnout-track";
            track.setAttribute("role", "img");
            track.setAttribute("aria-label", percentage.toFixed(1) + "% turnout");
            const fill = document.createElement("div");
            fill.className = "turnout-track-fill";
            fill.style.width = Math.max(0, Math.min(percentage, 100)) + "%";
            track.appendChild(fill);
            turnoutCell.append(label, track);
        }

        row.append(constituencyCell, registeredCell, votedCell, remainingCell, turnoutCell);
        body.appendChild(row);
    });
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
document.getElementById("printSummaryBtn").addEventListener("click", printElectionSummary);
document.getElementById("downloadResultsBtn").addEventListener("click", downloadConstituencyCsv);

window.onload = function () {
    showSection(getSectionFromLocation(), false);
};

window.addEventListener("popstate", () => {
    showSection(getSectionFromLocation(), false);
});

setInterval(function () {
    if (document.getElementById("dashboardSection").style.display !== "none") {
        loadDashboard();
    }
    if (document.getElementById("reportsSection").style.display !== "none") {
        loadReports();
    }
}, 60000);
