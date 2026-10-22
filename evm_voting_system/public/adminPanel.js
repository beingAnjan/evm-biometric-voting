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

    if (section === "dashboard") {
        document.getElementById("pageTitle").innerText = "Dashboard";
        document.getElementById("dashboardSection").style.display = "block";
        loadDashboard();
    }

    if (section === "election") {
        document.getElementById("pageTitle").innerText = "Election settings";
        document.getElementById("electionSection").style.display = "block";
        loadElectionSettings();
    }

    if (section === "constituency") {
        document.getElementById("pageTitle").innerText = "Constituencies";
        document.getElementById("constituencySection").style.display = "block";
        initializeDropdowns();
    }

    if (section === "reports") {
        document.getElementById("pageTitle").innerText = "Reports";
        document.getElementById("reportsSection").style.display = "block";
        loadReports();
    }
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

async function loadDashboard() {
    const totalVotes = document.getElementById("totalVotes");
    const turnout = document.getElementById("turnout");
    const leadingCandidate = document.getElementById("leadingCandidate");

    totalVotes.innerText = "Loading…";
    turnout.innerText = "Loading…";
    leadingCandidate.innerText = "Loading…";

    try {
        const response = await fetch("/admin/dashboard");
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load dashboard statistics.");

        totalVotes.innerText = Number(data.totalVotes).toLocaleString();
        turnout.innerText = `${data.turnout}%`;
        leadingCandidate.innerText = data.leadingCandidate || "--";
    } catch (error) {
        totalVotes.innerText = "—";
        turnout.innerText = "—";
        leadingCandidate.innerText = "—";
        console.error("Dashboard loading error:", error);
    }
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

window.onload = function () {

    showSection("dashboard");

};
