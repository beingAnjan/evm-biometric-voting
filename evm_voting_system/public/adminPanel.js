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

function loadDashboard() {

    document.getElementById("totalVotes").innerText = "1,25,000";
    document.getElementById("turnout").innerText = "75%";
    document.getElementById("leadingParty").innerText = "Party A";
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

    window.location.replace("page.html");

}

/* ================= INITIAL LOAD ================= */

window.onload = function () {

    showSection("dashboard");

};