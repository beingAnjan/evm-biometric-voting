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

    document.getElementById("constituencyTable").innerHTML = "";
}

/* ================= LOAD CONSTITUENCIES ================= */

function loadConstituenciesDropdown() {

    const districtName = document.getElementById("districtSelect").value;

    const constituencySelect = document.getElementById("constituencySelect");

    constituencySelect.innerHTML =
        '<option value="">Select Constituency</option>';

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

    const table = document.getElementById("constituencyTable");

    table.innerHTML = "";

    if (!constituency) return;

    try {

        const response = await fetch(
            `/results?state=${stateName}&district=${district}&constituency=${constituency}`
        );

        const data = await response.json();

        table.innerHTML = `
            <tr>
                <td>${constituency}</td>
                <td>${data.totalVotes}</td>
                <td>${data.winner}</td>
            </tr>
        `;

    } catch (error) {

        table.innerHTML = `
            <tr>
                <td>${constituency}</td>
                <td>0</td>
                <td>--</td>
            </tr>
        `;
    }
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

function loadReports() {

    document.getElementById("closeFights").innerHTML = `
        <li>Anakapalli - Margin 1,200</li>
        <li>Vizag East - Margin 950</li>
    `;

    document.getElementById("highestTurnout").innerText =
        "Anakapalli (82%)";
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

window.onload = function () {
    showSection("dashboard");
};

setInterval(function () {
    if (document.getElementById("dashboardSection").style.display !== "none") {
        loadDashboard();
    }
}, 60000);
